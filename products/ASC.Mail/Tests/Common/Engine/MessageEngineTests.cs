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
using System.IO;
using System.Linq;
using System.Text;
using ASC.Core;
using ASC.Core.Users;
using ASC.Mail.Aggregator.Tests.Common.Utils;
using ASC.Mail.Models;
using ASC.Mail.Enums;
using ASC.Mail.Extensions;
using ASC.Mail.Utils;
using NUnit.Framework;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;
using ASC.Common;
using ASC.Common.Logging;
using ASC.Api.Core.Auth;
using ASC.Api.Core.Middleware;
using ASC.Mail.Core.Engine;
using Autofac;
using ASC.ElasticSearch;
using ASC.Api.Core;

namespace ASC.Mail.Aggregator.Tests.Common.Engine
{
    [TestFixture]
    internal class MessageEngineTests
    {
        private const int CURRENT_TENANT = 0;
        public const string PASSWORD = "123456";
        public const string DOMAIN = "gmail.com";

        private static readonly string TestFolderPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory,
           @"..\..\..\Data\");
        private const string EML1_FILE_NAME = @"bad_encoding.eml";
        private static readonly string Eml1Path = TestFolderPath + EML1_FILE_NAME;

        public UserInfo TestUser { get; private set; }
        public MailBoxData TestMailbox { get; set; }
        public int MailId { get; set; }
        IServiceProvider ServiceProvider { get; set; }
        IHost TestHost { get; set; }

        [OneTimeSetUp]
        public void Prepare()
        {
            var args = new string[] { };

            TestHost = Host.CreateDefaultBuilder(args)
                .ConfigureAppConfiguration((hostContext, config) =>
                {
                    var buided = config.Build();
                    var path = buided["pathToConf"];
                    if (!Path.IsPathRooted(path))
                    {
                        path = Path.GetFullPath(Path.Combine(hostContext.HostingEnvironment.ContentRootPath, path));
                    }

                    config.SetBasePath(path);

                    config
                        .AddInMemoryCollection(new Dictionary<string, string>
                        {
                        {"pathToConf", path}
                        })
                        .AddJsonFile("appsettings.json")
                        .AddJsonFile($"appsettings.{hostContext.HostingEnvironment.EnvironmentName}.json", true)
                        .AddJsonFile("storage.json")
                        .AddJsonFile("kafka.json")
                        .AddJsonFile($"kafka.{hostContext.HostingEnvironment.EnvironmentName}.json", true)
                        .AddEnvironmentVariables();

                })
                .ConfigureServices((hostContext, services) =>
                {
                    services.AddHttpContextAccessor();

                    var diHelper = new DIHelper(services);

                    diHelper
                        .AddCookieAuthHandler()
                        .AddCultureMiddleware()
                        .AddIpSecurityFilter()
                        .AddPaymentFilter()
                        .AddProductSecurityFilter()
                        .AddTenantStatusFilter();

                    diHelper.AddNLogManager("ASC.Api", "ASC.Web");

                    diHelper
                        .AddTenantManagerService()
                        .AddUserManagerService()
                        .AddSecurityContextService()
                        .AddMailBoxSettingEngineService()
                        .AddMailboxEngineService()
                        .AddApiHelperService()
                        .AddFolderEngineService()
                        .AddUserFolderEngineService()
                        .AddFactoryIndexerHelperService()
                        .AddFactoryIndexerService()
                        .AddFactoryIndexerService<MailWrapper>()
                        .AddMailGarbageEngineService()
                        .AddTestEngineService()
                        .AddMessageEngineService()
                        .AddCoreSettingsService()
                        .AddApiDateTimeHelper();

                    var builder = new ContainerBuilder();
                    var container = builder.Build();

                    services.TryAddSingleton(container);

                    //services.AddAutofac(hostContext.Configuration, hostContext.HostingEnvironment.ContentRootPath);
                })
                .UseConsoleLifetime()
                .Build();

            TestHost.Start();

            ServiceProvider = TestHost.Services;
        }

        [SetUp]
        public void SetUp()
        {
            using var scope = ServiceProvider.CreateScope();
            var userManager = scope.ServiceProvider.GetService<UserManager>();
            var tenantManager = scope.ServiceProvider.GetService<TenantManager>();
            var securityContext = scope.ServiceProvider.GetService<SecurityContext>();
            var mailBoxSettingEngine = scope.ServiceProvider.GetService<MailBoxSettingEngine>();
            var mailboxEngine = scope.ServiceProvider.GetService<MailboxEngine>();
            var apiHelper = scope.ServiceProvider.GetService<ApiHelper>();

            tenantManager.SetCurrentTenant(CURRENT_TENANT);
            securityContext.AuthenticateMe(ASC.Core.Configuration.Constants.CoreSystem);

            var testEngine = scope.ServiceProvider.GetService<TestEngine>();

            TestUser = TestHelper.CreateNewRandomEmployee(userManager, securityContext, tenantManager, apiHelper);

            securityContext.AuthenticateMe(TestUser.ID);

            var mailboxSettings = mailBoxSettingEngine.GetMailBoxSettings(DOMAIN);

            var testMailboxes = mailboxSettings.ToMailboxList(TestUser.Email, PASSWORD, CURRENT_TENANT, TestUser.ID.ToString());

            TestMailbox = testMailboxes.FirstOrDefault();

            if (TestMailbox == null || !mailboxEngine.SaveMailBox(TestMailbox))
            {
                throw new Exception(string.Format("Can't create mailbox with email: {0}", TestUser.Email));
            }

            using var fs = new FileStream(Eml1Path, FileMode.Open, FileAccess.Read);

            var model = new TestMessageModel
            {
                FolderId = (int)FolderType.Inbox,
                UserFolderId = null,
                MailboxId = TestMailbox.MailBoxId,
                Unread = true,
                EmlStream = fs
            };

            MailId = testEngine.LoadSampleMessage(model);
        }

        [TearDown]
        public void CleanUp()
        {
            if (TestUser == null || TestUser.ID == Guid.Empty)
                return;

            using var scope = ServiceProvider.CreateScope();

            var tenantManager = scope.ServiceProvider.GetService<TenantManager>();
            var securityContext = scope.ServiceProvider.GetService<SecurityContext>();

            tenantManager.SetCurrentTenant(CURRENT_TENANT);
            securityContext.AuthenticateMe(ASC.Core.Configuration.Constants.CoreSystem);

            // Remove TestUser profile
            var userManager = scope.ServiceProvider.GetService<UserManager>();
            userManager.DeleteUser(TestUser.ID);

            // Clear TestUser mail index
            var factoryIndexer = scope.ServiceProvider.GetService<FactoryIndexer<MailWrapper>>();
            var factoryIndexerHelper = scope.ServiceProvider.GetService<FactoryIndexerHelper>();

            var t = scope.ServiceProvider.GetService<MailWrapper>();
            if (factoryIndexerHelper.Support(t))
                factoryIndexer.DeleteAsync(s => s.Where(m => m.UserId, TestUser.ID)).Wait();

            // Clear TestUser mail data
            var mailGarbageEngine = scope.ServiceProvider.GetService<MailGarbageEngine>();
            mailGarbageEngine.ClearUserMail(TestUser.ID, tenantManager.GetCurrentTenant());
        }

        [Test]
        public void GetMessageStreamTest()
        {
            using var scope = ServiceProvider.CreateScope();
            var userManager = scope.ServiceProvider.GetService<UserManager>();
            var tenantManager = scope.ServiceProvider.GetService<TenantManager>();
            var securityContext = scope.ServiceProvider.GetService<SecurityContext>();

            tenantManager.SetCurrentTenant(CURRENT_TENANT);
            securityContext.AuthenticateMe(TestUser.ID);

            var messageEngine = scope.ServiceProvider.GetService<MessageEngine>();

            string htmlBody;
            using (var stream = messageEngine.GetMessageStream(MailId))
            {
                htmlBody = Encoding.UTF8.GetString(stream.ReadToEnd());
            }

            Assert.IsNotNull(htmlBody);
            Assert.IsNotEmpty(htmlBody);
            Assert.AreEqual(83689, htmlBody.Length);
        }

        [Test]
        public void RemoveMessageTest()
        {
            // Bug 34937

            using var scope = ServiceProvider.CreateScope();
            var userManager = scope.ServiceProvider.GetService<UserManager>();
            var tenantManager = scope.ServiceProvider.GetService<TenantManager>();
            var securityContext = scope.ServiceProvider.GetService<SecurityContext>();

            tenantManager.SetCurrentTenant(CURRENT_TENANT);
            securityContext.AuthenticateMe(TestUser.ID);

            var messageEngine = scope.ServiceProvider.GetService<MessageEngine>();
            var folderEngine = scope.ServiceProvider.GetService<FolderEngine>();

            var folders = folderEngine.GetFolders();

            var inbox = folders.FirstOrDefault(f => f.id == FolderType.Inbox);

            Assert.IsNotNull(inbox);
            Assert.AreEqual(1, inbox.totalMessages);
            Assert.AreEqual(1, inbox.unreadMessages);
            Assert.AreEqual(1, inbox.total);
            Assert.AreEqual(1, inbox.unread);

            messageEngine.SetRemoved(new List<int> { MailId });

            folders = folderEngine.GetFolders();

            inbox = folders.FirstOrDefault(f => f.id == FolderType.Inbox);

            Assert.IsNotNull(inbox);
            Assert.AreEqual(0, inbox.totalMessages);
            Assert.AreEqual(0, inbox.unreadMessages);
            Assert.AreEqual(0, inbox.total);
            Assert.AreEqual(0, inbox.unread);
        }
    }
}
