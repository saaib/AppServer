/*
 *
 * (c) Copyright Ascensio System Limited 2010-2020
 *
 * This program is freeware. You can redistribute it and/or modify it under the terms of the GNU 
 * General Public License (GPL) version 3 as published by the Free Software Foundation (https://www.gnu.org/copyleft/gpl.html). 
 * In accordance with Section 7(a) of the GNU GPL its Section 15 shall be amended to the effect that 
 * Ascensio System SIA expressly excludes the warranty of non-infringement of any third-party rights.
 *
 * THIS PROGRAM IS DISTRIBUTED WITHOUT ANY WARRANTY; WITHOUT EVEN THE IMPLIED WARRANTY OF MERCHANTABILITY OR
 * FITNESS FOR A PARTICULAR PURPOSE. For more details, see GNU GPL at https://www.gnu.org/copyleft/gpl.html
 *
 * You can contact Ascensio System SIA by email at sales@onlyoffice.com
 *
 * The interactive user interfaces in modified source and object code versions of ONLYOFFICE must display 
 * Appropriate Legal Notices, as required under Section 5 of the GNU GPL version 3.
 *
 * Pursuant to Section 7 § 3(b) of the GNU GPL you must retain the original ONLYOFFICE logo which contains 
 * relevant author attributions when distributing the software. If the display of the logo in its graphic 
 * form is not reasonably feasible for technical reasons, you must include the words "Powered by ONLYOFFICE" 
 * in every copy of the program you distribute. 
 * Pursuant to Section 7 § 3(e) we decline to grant you any rights under trademark law for use of our trademarks.
 *
*/


using System;
using System.Collections.Generic;
using System.Configuration;
using System.Diagnostics;
using System.Linq;
using ASC.Common.Threading;
using ASC.Core;
using ASC.Mail.Core.Engine.Operations;
using ASC.Mail.Core.Engine.Operations.Base;
using ASC.Mail.Core.Entities;
using ASC.Mail.Models;
using SecurityContext = ASC.Core.SecurityContext;
using Microsoft.Extensions.Options;
using ASC.Common.Logging;
using ASC.Mail.Storage;
using ASC.Common;
using ASC.ElasticSearch;

namespace ASC.Mail.Core.Engine
{
    public class OperationEngine
    {
        public DistributedTaskQueue MailOperations { get; }

        public int MailOperationsLimit
        {
            get
            {
                var limit = ConfigurationManager.AppSettings["mail.operations-limit"];
                return limit != null ? Convert.ToInt32(limit) : 100;
            }
        }

        public DistributedTaskCacheNotify DistributedTaskCacheNotify { get; }
        public TenantManager TenantManager { get; }
        public SecurityContext SecurityContext { get; }
        public DaoFactory DaoFactory { get; }
        public MailboxEngine MailboxEngine { get; }
        public QuotaEngine QuotaEngine { get; }
        public FolderEngine FolderEngine { get; }
        public CacheEngine CacheEngine { get; }
        public IndexEngine IndexEngine { get; }
        public UserFolderEngine UserFolderEngine { get; }
        public FilterEngine FilterEngine { get; }
        public MessageEngine MessageEngine { get; }
        public ServerMailboxEngine ServerMailboxEngine { get; }
        public CoreSettings CoreSettings { get; }
        public StorageManager StorageManager { get; }
        public FactoryIndexerHelper FactoryIndexerHelper { get; }
        public IServiceProvider ServiceProvider { get; }
        public IOptionsMonitor<ILog> Option { get; }

        public OperationEngine(
            DistributedTaskCacheNotify distributedTaskCacheNotify,
            TenantManager tenantManager,
            SecurityContext securityContext,
            DaoFactory daoFactory,
            MailboxEngine mailboxEngine,
            QuotaEngine quotaEngine,
            FolderEngine folderEngine,
            CacheEngine cacheEngine,
            IndexEngine indexEngine,
            UserFolderEngine userFolderEngine,
            FilterEngine filterEngine,
            MessageEngine messageEngine,
            ServerMailboxEngine serverMailboxEngine, 
            CoreSettings coreSettings,
            StorageManager storageManager,
            FactoryIndexerHelper factoryIndexerHelper,
            IServiceProvider serviceProvider,
            IOptionsMonitor<ILog> option)
        {
            MailOperations = new DistributedTaskQueue(distributedTaskCacheNotify, 
                "mailOperations", MailOperationsLimit);

            DistributedTaskCacheNotify = distributedTaskCacheNotify;
            TenantManager = tenantManager;
            SecurityContext = securityContext;
            DaoFactory = daoFactory;
            MailboxEngine = mailboxEngine;
            QuotaEngine = quotaEngine;
            FolderEngine = folderEngine;
            CacheEngine = cacheEngine;
            IndexEngine = indexEngine;
            UserFolderEngine = userFolderEngine;
            FilterEngine = filterEngine;
            MessageEngine = messageEngine;
            ServerMailboxEngine = serverMailboxEngine;
            CoreSettings = coreSettings;
            StorageManager = storageManager;
            FactoryIndexerHelper = factoryIndexerHelper;
            ServiceProvider = serviceProvider;
            Option = option;
        }

        public MailOperationStatus RemoveMailbox(MailBoxData mailbox,
            Func<DistributedTask, string> translateMailOperationStatus = null)
        {
            var tenant = TenantManager.GetCurrentTenant();
            var user = SecurityContext.CurrentAccount;

            var operations = MailOperations.GetTasks()
                .Where(o =>
                {
                    var oTenant = o.GetProperty<int>(MailOperation.TENANT);
                    var oUser = o.GetProperty<string>(MailOperation.OWNER);
                    var oType = o.GetProperty<MailOperationType>(MailOperation.OPERATION_TYPE);
                    return oTenant == tenant.TenantId &&
                           oUser == user.ID.ToString() &&
                           oType == MailOperationType.RemoveMailbox;
                })
                .ToList();

            var sameOperation = operations.FirstOrDefault(o =>
            {
                var oSource = o.GetProperty<string>(MailOperation.SOURCE);
                return oSource == mailbox.MailBoxId.ToString();
            });

            if (sameOperation != null)
            {
                return GetMailOperationStatus(sameOperation.Id, translateMailOperationStatus);
            }

            var runningOperation = operations.FirstOrDefault(o => o.Status <= DistributedTaskStatus.Running);

            if (runningOperation != null)
                throw new MailOperationAlreadyRunningException("Remove mailbox operation already running.");

            var op = new MailRemoveMailboxOperation(
                TenantManager, 
                SecurityContext, 
                MailboxEngine, 
                QuotaEngine, 
                FolderEngine, 
                CacheEngine, 
                IndexEngine,
                DaoFactory, 
                CoreSettings, 
                StorageManager, 
                Option, 
                mailbox);

            return QueueTask(op, translateMailOperationStatus);
        }

        public MailOperationStatus DownloadAllAttachments(int messageId,
            Func<DistributedTask, string> translateMailOperationStatus = null)
        {
            var tenant = TenantManager.GetCurrentTenant();
            var user = SecurityContext.CurrentAccount;

            var operations = MailOperations.GetTasks()
                .Where(o =>
                {
                    var oTenant = o.GetProperty<int>(MailOperation.TENANT);
                    var oUser = o.GetProperty<string>(MailOperation.OWNER);
                    var oType = o.GetProperty<MailOperationType>(MailOperation.OPERATION_TYPE);
                    return oTenant == tenant.TenantId &&
                           oUser == user.ID.ToString() &&
                           oType == MailOperationType.DownloadAllAttachments;
                })
                .ToList();

            var sameOperation = operations.FirstOrDefault(o =>
            {
                var oSource = o.GetProperty<string>(MailOperation.SOURCE);
                return oSource == messageId.ToString();
            });

            if (sameOperation != null)
            {
                return GetMailOperationStatus(sameOperation.Id, translateMailOperationStatus);
            }

            var runningOperation = operations.FirstOrDefault(o => o.Status <= DistributedTaskStatus.Running);

            if (runningOperation != null)
                throw new MailOperationAlreadyRunningException("Download all attachments operation already running.");

            var op = new MailDownloadAllAttachmentsOperation(
                TenantManager,
                SecurityContext,
                DaoFactory,
                MessageEngine,
                CoreSettings,
                StorageManager,
                Option,
                messageId);

            return QueueTask(op, translateMailOperationStatus);
        }

        public MailOperationStatus RecalculateFolders(Func<DistributedTask, string> translateMailOperationStatus = null)
        {
            var tenant = TenantManager.GetCurrentTenant();
            var user = SecurityContext.CurrentAccount;

            var operations = MailOperations.GetTasks()
                .Where(o =>
                {
                    var oTenant = o.GetProperty<int>(MailOperation.TENANT);
                    var oUser = o.GetProperty<string>(MailOperation.OWNER);
                    var oType = o.GetProperty<MailOperationType>(MailOperation.OPERATION_TYPE);
                    return oTenant == tenant.TenantId &&
                           oUser == user.ID.ToString() &&
                           oType == MailOperationType.RecalculateFolders;
                });

            var runningOperation = operations.FirstOrDefault(o => o.Status <= DistributedTaskStatus.Running);

            if (runningOperation != null)
                return GetMailOperationStatus(runningOperation.Id, translateMailOperationStatus);

            var op = new MailRecalculateFoldersOperation(
                TenantManager,
                SecurityContext,
                DaoFactory,
                FolderEngine,
                CoreSettings,
                StorageManager,
                Option);

            return QueueTask(op, translateMailOperationStatus);
        }

        public MailOperationStatus CheckDomainDns(string domainName, ServerDns dns,
            Func<DistributedTask, string> translateMailOperationStatus = null)
        {
            var tenant = TenantManager.GetCurrentTenant();
            var user = SecurityContext.CurrentAccount;

            var operations = MailOperations.GetTasks()
                .Where(o =>
                {
                    var oTenant = o.GetProperty<int>(MailOperation.TENANT);
                    var oUser = o.GetProperty<string>(MailOperation.OWNER);
                    var oType = o.GetProperty<MailOperationType>(MailOperation.OPERATION_TYPE);
                    var oSource = o.GetProperty<string>(MailOperation.SOURCE);
                    return oTenant == tenant.TenantId &&
                           oUser == user.ID.ToString() &&
                           oType == MailOperationType.CheckDomainDns &&
                           oSource == domainName;
                });

            var runningOperation = operations.FirstOrDefault(o => o.Status <= DistributedTaskStatus.Running);

            if (runningOperation != null)
                return GetMailOperationStatus(runningOperation.Id, translateMailOperationStatus);

            var op = new MailCheckMailserverDomainsDnsOperation(
                TenantManager,
                SecurityContext,
                DaoFactory,
                CoreSettings,
                StorageManager,
                Option,
                domainName, 
                dns);

            return QueueTask(op, translateMailOperationStatus);
        }

        public MailOperationStatus RemoveUserFolder(uint userFolderId,
            Func<DistributedTask, string> translateMailOperationStatus = null)
        {
            var tenant = TenantManager.GetCurrentTenant();
            var user = SecurityContext.CurrentAccount;

            var operations = MailOperations.GetTasks()
                .Where(o =>
                {
                    var oTenant = o.GetProperty<int>(MailOperation.TENANT);
                    var oUser = o.GetProperty<string>(MailOperation.OWNER);
                    var oType = o.GetProperty<MailOperationType>(MailOperation.OPERATION_TYPE);
                    return oTenant == tenant.TenantId &&
                           oUser == user.ID.ToString() &&
                           oType == MailOperationType.RemoveUserFolder;
                })
                .ToList();

            var sameOperation = operations.FirstOrDefault(o =>
            {
                var oSource = o.GetProperty<string>(MailOperation.SOURCE);
                return oSource == userFolderId.ToString();
            });

            if (sameOperation != null)
            {
                return GetMailOperationStatus(sameOperation.Id, translateMailOperationStatus);
            }

            var runningOperation = operations.FirstOrDefault(o => o.Status <= DistributedTaskStatus.Running);

            if (runningOperation != null)
                throw new MailOperationAlreadyRunningException("Remove user folder operation already running.");

            var op = new MailRemoveUserFolderOperation(
                TenantManager,
                SecurityContext,
                DaoFactory,
                UserFolderEngine, 
                MessageEngine, 
                IndexEngine,
                CoreSettings,
                StorageManager, 
                FactoryIndexerHelper, 
                ServiceProvider,
                Option,
                userFolderId);

            return QueueTask(op, translateMailOperationStatus);
        }

        public MailOperationStatus ApplyFilter(int filterId,
            Func<DistributedTask, string> translateMailOperationStatus = null)
        {
            var tenant = TenantManager.GetCurrentTenant();
            var user = SecurityContext.CurrentAccount;

            var operations = MailOperations.GetTasks()
                .Where(o =>
                {
                    var oTenant = o.GetProperty<int>(MailOperation.TENANT);
                    var oUser = o.GetProperty<string>(MailOperation.OWNER);
                    var oType = o.GetProperty<MailOperationType>(MailOperation.OPERATION_TYPE);
                    return oTenant == tenant.TenantId &&
                           oUser == user.ID.ToString() &&
                           oType == MailOperationType.ApplyFilter;
                })
                .ToList();

            var sameOperation = operations.FirstOrDefault(o =>
            {
                var oSource = o.GetProperty<string>(MailOperation.SOURCE);
                return oSource == filterId.ToString();
            });

            if (sameOperation != null)
            {
                return GetMailOperationStatus(sameOperation.Id, translateMailOperationStatus);
            }

            var runningOperation = operations.FirstOrDefault(o => o.Status <= DistributedTaskStatus.Running);

            if (runningOperation != null)
                throw new MailOperationAlreadyRunningException("Apply filter operation already running.");

            var op = new ApplyFilterOperation(
                TenantManager,
                SecurityContext,
                DaoFactory, 
                FilterEngine, 
                MessageEngine,
                CoreSettings,
                StorageManager,
                Option,
                filterId);

            return QueueTask(op, translateMailOperationStatus);
        }

        public MailOperationStatus ApplyFilters(List<int> ids,
            Func<DistributedTask, string> translateMailOperationStatus = null)
        {
            var tenant = TenantManager.GetCurrentTenant();
            var user = SecurityContext.CurrentAccount;

            var op = new ApplyFiltersOperation(
                TenantManager,
                SecurityContext,
                DaoFactory,
                FilterEngine, 
                MessageEngine, 
                MailboxEngine,
                CoreSettings,
                StorageManager,
                Option,
                ids);

            return QueueTask(op, translateMailOperationStatus);
        }

        public MailOperationStatus RemoveServerDomain(ServerDomainData domain)
        {
            var tenant = TenantManager.GetCurrentTenant();
            var user = SecurityContext.CurrentAccount;

            var operations = MailOperations.GetTasks()
                .Where(o =>
                {
                    var oTenant = o.GetProperty<int>(MailOperation.TENANT);
                    var oUser = o.GetProperty<string>(MailOperation.OWNER);
                    var oType = o.GetProperty<MailOperationType>(MailOperation.OPERATION_TYPE);
                    return oTenant == tenant.TenantId &&
                           oUser == user.ID.ToString() &&
                           oType == MailOperationType.RemoveDomain;
                })
                .ToList();

            var sameOperation = operations.FirstOrDefault(o =>
            {
                var oSource = o.GetProperty<string>(MailOperation.SOURCE);
                return oSource == domain.Id.ToString();
            });

            if (sameOperation != null)
            {
                return GetMailOperationStatus(sameOperation.Id);
            }

            var runningOperation = operations.FirstOrDefault(o => o.Status <= DistributedTaskStatus.Running);

            if (runningOperation != null)
                throw new MailOperationAlreadyRunningException("Remove mailbox operation already running.");

            var op = new MailRemoveMailserverDomainOperation(
                TenantManager, SecurityContext, 
                DaoFactory, MailboxEngine, CacheEngine, IndexEngine,
                CoreSettings, StorageManager, 
                Option, domain);

            return QueueTask(op);
        }

        public MailOperationStatus RemoveServerMailbox(MailBoxData mailbox)
        {
            var tenant = TenantManager.GetCurrentTenant();
            var user = SecurityContext.CurrentAccount;

            var operations = MailOperations.GetTasks()
                .Where(o =>
                {
                    var oTenant = o.GetProperty<int>(MailOperation.TENANT);
                    var oUser = o.GetProperty<string>(MailOperation.OWNER);
                    var oType = o.GetProperty<MailOperationType>(MailOperation.OPERATION_TYPE);
                    return oTenant == tenant.TenantId &&
                           oUser == user.ID.ToString() &&
                           oType == MailOperationType.RemoveMailbox;
                })
                .ToList();

            var sameOperation = operations.FirstOrDefault(o =>
            {
                var oSource = o.GetProperty<string>(MailOperation.SOURCE);
                return oSource == mailbox.MailBoxId.ToString();
            });

            if (sameOperation != null)
            {
                return GetMailOperationStatus(sameOperation.Id);
            }

            var runningOperation = operations.FirstOrDefault(o => o.Status <= DistributedTaskStatus.Running);

            if (runningOperation != null)
                throw new MailOperationAlreadyRunningException("Remove mailbox operation already running.");

            var op = new MailRemoveMailserverMailboxOperation(
                TenantManager, SecurityContext,
                DaoFactory, ServerMailboxEngine, this, CacheEngine, IndexEngine,
                CoreSettings, StorageManager,
                Option, mailbox);

            return QueueTask(op);
        }

        public MailOperationStatus QueueTask(MailOperation op, Func<DistributedTask, string> translateMailOperationStatus = null)
        {
            var task = op.GetDistributedTask();
            MailOperations.QueueTask(op.RunJob, task);
            return GetMailOperationStatus(task.Id, translateMailOperationStatus);
        }

        public List<MailOperationStatus> GetMailOperations(Func<DistributedTask, string> translateMailOperationStatus = null)
        {
            var tenant = TenantManager.GetCurrentTenant().TenantId;

            var operations = MailOperations.GetTasks().Where(
                    o =>
                        o.GetProperty<int>(MailOperation.TENANT) == tenant &&
                        o.GetProperty<string>(MailOperation.OWNER) == SecurityContext.CurrentAccount.ID.ToString());

            var list = new List<MailOperationStatus>();

            foreach (var o in operations)
            {
                if (string.IsNullOrEmpty(o.Id))
                    continue;

                list.Add(GetMailOperationStatus(o.Id, translateMailOperationStatus));
            }

            return list;
        }

        public MailOperationStatus GetMailOperationStatus(string operationId, Func<DistributedTask, string> translateMailOperationStatus = null)
        {
            var defaultResult = new MailOperationStatus
            {
                Id = null,
                Completed = true,
                Percents = 100,
                Status = "",
                Error = "",
                Source = "",
                OperationType = -1
            };

            if (string.IsNullOrEmpty(operationId))
                return defaultResult;

            var operations = MailOperations.GetTasks().ToList();

            foreach (var o in operations)
            {
                if (!string.IsNullOrEmpty(o.InstanceId) &&
                    Process.GetProcesses().Any(p => p.Id == int.Parse(o.InstanceId)))
                    continue;

                o.SetProperty(MailOperation.PROGRESS, 100);
                MailOperations.RemoveTask(o.Id);
            }

            var tenant = TenantManager.GetCurrentTenant().TenantId;

            var operation = operations
                .FirstOrDefault(
                    o =>
                        o.GetProperty<int>(MailOperation.TENANT) == tenant &&
                        o.GetProperty<string>(MailOperation.OWNER) == SecurityContext.CurrentAccount.ID.ToString() &&
                        o.Id.Equals(operationId));

            if (operation == null)
                return defaultResult;

            if (DistributedTaskStatus.Running < operation.Status)
            {
                operation.SetProperty(MailOperation.PROGRESS, 100);
                MailOperations.RemoveTask(operation.Id);
            }

            var operationTypeIndex = (int)operation.GetProperty<MailOperationType>(MailOperation.OPERATION_TYPE);

            var result = new MailOperationStatus
            {
                Id = operation.Id,
                Completed = operation.GetProperty<bool>(MailOperation.FINISHED),
                Percents = operation.GetProperty<int>(MailOperation.PROGRESS),
                Status = translateMailOperationStatus != null
                    ? translateMailOperationStatus(operation)
                    : operation.GetProperty<string>(MailOperation.STATUS),
                Error = operation.GetProperty<string>(MailOperation.ERROR),
                Source = operation.GetProperty<string>(MailOperation.SOURCE),
                OperationType = operationTypeIndex,
                Operation = Enum.GetName(typeof(MailOperationType), operationTypeIndex)
            };

            return result;
        }
    }

    public static class OperationEngineExtension
    {
        public static DIHelper AddOperationEngineService(this DIHelper services)
        {
            services.TryAddSingleton<DistributedTaskCacheNotify>();
            services.TryAddScoped<OperationEngine>();

            services.AddTenantManagerService()
                .AddSecurityContextService()
                .AddDaoFactoryService()
                .AddMailboxEngineService()
                .AddQuotaEngineService()
                .AddFolderEngineService()
                .AddCacheEngineService()
                .AddIndexEngineService()
                .AddUserFolderEngineService()
                .AddFilterEngineService()
                .AddMessageEngineService()
                .AddServerMailboxEngineService()
                .AddCoreSettingsService()
                .AddStorageManagerService()
                .AddFactoryIndexerHelperService();

            return services;
        }
    }
}
