/*
 *
 * (c) Copyright Ascensio System Limited 2010-2018
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
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using ASC.Common;
using ASC.Common.Logging;
using ASC.Core;
using ASC.Core.Common.EF;
using ASC.Core.Tenants;
using ASC.Files.Core;
using ASC.Files.Core.EF;
using ASC.Files.Core.Thirdparty;
using ASC.Web.Core.Files;
using ASC.Web.Studio.Core;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace ASC.Files.Thirdparty.SharePoint
{
    [Scope]
    internal class SharePointFolderDao : SharePointDaoBase, IFolderDao<string>
    {
        private CrossDao CrossDao { get; }
        private SharePointDaoSelector SharePointDaoSelector { get; }
        private IFileDao<int> FileDao { get; }
        private IFolderDao<int> FolderDao { get; }

        public SharePointFolderDao(
            IServiceProvider serviceProvider,
            UserManager userManager,
            TenantManager tenantManager,
            TenantUtil tenantUtil,
            DbContextManager<FilesDbContext> dbContextManager,
            SetupInfo setupInfo,
            IOptionsMonitor<ILog> monitor,
            FileUtility fileUtility,
            CrossDao crossDao,
            SharePointDaoSelector sharePointDaoSelector,
            IFileDao<int> fileDao,
            IFolderDao<int> folderDao)
            : base(serviceProvider, userManager, tenantManager, tenantUtil, dbContextManager, setupInfo, monitor, fileUtility)
        {
            CrossDao = crossDao;
            SharePointDaoSelector = sharePointDaoSelector;
            FileDao = fileDao;
            FolderDao = folderDao;
        }

        public Task<Folder<string>> GetFolder(string folderId)
        {
            return Task.FromResult(GetFolderSync(folderId));
        }
        public Folder<string> GetFolderSync(string folderId)
        {
            return ProviderInfo.ToFolder(ProviderInfo.GetFolderById(folderId));
        }

        public Task<Folder<string>> GetFolder(string title, string parentId)
        {
            return
                Task.FromResult(ProviderInfo.ToFolder(
                    ProviderInfo.GetFolderFolders(parentId)
                        .FirstOrDefault(item => item.Name.Equals(title, StringComparison.InvariantCultureIgnoreCase))));
        }

        public Task<Folder<string>> GetRootFolder(string folderId)
        {
            return Task.FromResult(ProviderInfo.ToFolder(ProviderInfo.RootFolder));
        }

        public Task<Folder<string>> GetRootFolderByFile(string fileId)
        {
            return Task.FromResult(ProviderInfo.ToFolder(ProviderInfo.RootFolder));
        }

        public Task<List<Folder<string>>> GetFolders(string parentId)
        {
            return Task.FromResult(ProviderInfo.GetFolderFolders(parentId).Select(r => ProviderInfo.ToFolder(r)).ToList());
        }

        public async Task<List<Folder<string>>> GetFolders(string parentId, OrderBy orderBy, FilterType filterType, bool subjectGroup, Guid subjectID, string searchText, bool withSubfolders = false)
        {
            if (filterType == FilterType.FilesOnly || filterType == FilterType.ByExtension
                || filterType == FilterType.DocumentsOnly || filterType == FilterType.ImagesOnly
                || filterType == FilterType.PresentationsOnly || filterType == FilterType.SpreadsheetsOnly
                || filterType == FilterType.ArchiveOnly || filterType == FilterType.MediaOnly)
                return new List<Folder<string>>();

            var folders = (await GetFolders(parentId)).AsEnumerable();

            //Filter
            if (subjectID != Guid.Empty)
            {
                folders = folders.Where(x => subjectGroup
                                                 ? UserManager.IsUserInGroup(x.CreateBy, subjectID)
                                                 : x.CreateBy == subjectID);
            }

            if (!string.IsNullOrEmpty(searchText))
                folders = folders.Where(x => x.Title.IndexOf(searchText, StringComparison.OrdinalIgnoreCase) != -1);

            if (orderBy == null) orderBy = new OrderBy(SortedByType.DateAndTime, false);

            folders = orderBy.SortedBy switch
            {
                SortedByType.Author => orderBy.IsAsc ? folders.OrderBy(x => x.CreateBy) : folders.OrderByDescending(x => x.CreateBy),
                SortedByType.AZ => orderBy.IsAsc ? folders.OrderBy(x => x.Title) : folders.OrderByDescending(x => x.Title),
                SortedByType.DateAndTime => orderBy.IsAsc ? folders.OrderBy(x => x.ModifiedOn) : folders.OrderByDescending(x => x.ModifiedOn),
                SortedByType.DateAndTimeCreation => orderBy.IsAsc ? folders.OrderBy(x => x.CreateOn) : folders.OrderByDescending(x => x.CreateOn),
                _ => orderBy.IsAsc ? folders.OrderBy(x => x.Title) : folders.OrderByDescending(x => x.Title),
            };
            return folders.ToList();
        }

        public Task<List<Folder<string>>> GetFolders(IEnumerable<string> folderIds, FilterType filterType = FilterType.None, bool subjectGroup = false, Guid? subjectID = null, string searchText = "", bool searchSubfolders = false, bool checkShare = true)
        {
            if (filterType == FilterType.FilesOnly || filterType == FilterType.ByExtension
                || filterType == FilterType.DocumentsOnly || filterType == FilterType.ImagesOnly
                || filterType == FilterType.PresentationsOnly || filterType == FilterType.SpreadsheetsOnly
                || filterType == FilterType.ArchiveOnly || filterType == FilterType.MediaOnly)
                return Task.FromResult(new List<Folder<string>>());

            var folders = folderIds.Select(GetFolderSync);

            if (subjectID.HasValue && subjectID != Guid.Empty)
            {
                folders = folders.Where(x => subjectGroup
                                                 ? UserManager.IsUserInGroup(x.CreateBy, subjectID.Value)
                                                 : x.CreateBy == subjectID);
            }

            if (!string.IsNullOrEmpty(searchText))
                folders = folders.Where(x => x.Title.IndexOf(searchText, StringComparison.OrdinalIgnoreCase) != -1);

            return Task.FromResult(folders.ToList());
        }

        public Task<List<Folder<string>>> GetParentFolders(string folderId)
        {
            var path = new List<Folder<string>>();
            var folder = ProviderInfo.GetFolderById(folderId);
            if (folder != null)
            {
                do
                {
                    path.Add(ProviderInfo.ToFolder(folder));
                } while (folder != ProviderInfo.RootFolder && !(folder is SharePointFolderErrorEntry) &&
                         (folder = ProviderInfo.GetParentFolder(folder.ServerRelativeUrl)) != null);
            }
            path.Reverse();
            return Task.FromResult(path);
        }

        public async Task<string> SaveFolder(Folder<string> folder)
        {
            if (folder.ID != null)
            {
                //Create with id
                var savedfolder = ProviderInfo.CreateFolder(folder.ID);
                return ProviderInfo.ToFolder(savedfolder).ID;
            }

            if (folder.FolderID != null)
            {
                var parentFolder = ProviderInfo.GetFolderById(folder.FolderID);

                folder.Title = await GetAvailableTitle(folder.Title, parentFolder, IsExist);

                var newFolder = ProviderInfo.CreateFolder(parentFolder.ServerRelativeUrl + "/" + folder.Title);
                return ProviderInfo.ToFolder(newFolder).ID;
            }

            return null;
        }

        public Task<bool> IsExist(string title, Microsoft.SharePoint.Client.Folder folder)
        {
            return Task.FromResult(ProviderInfo.GetFolderFolders(folder.ServerRelativeUrl)
                .Any(item => item.Name.Equals(title, StringComparison.InvariantCultureIgnoreCase)));
        }

        public async Task DeleteFolder(string folderId)
        {
            var folder = ProviderInfo.GetFolderById(folderId);

            using (var tx = FilesDbContext.Database.BeginTransaction())
            {
                var hashIDs = await Query(FilesDbContext.ThirdpartyIdMapping)
                   .Where(r => r.Id.StartsWith(folder.ServerRelativeUrl))
                   .Select(r => r.HashId)
                   .ToListAsync();

                var link = await Query(FilesDbContext.TagLink)
                    .Where(r => hashIDs.Any(h => h == r.EntryId))
                    .ToListAsync();

                FilesDbContext.TagLink.RemoveRange(link);
                await FilesDbContext.SaveChangesAsync();

                var tagsToRemove = Query(FilesDbContext.Tag)
                    .Where(r => !Query(FilesDbContext.TagLink).Where(a => a.TagId == r.Id).Any());

                FilesDbContext.Tag.RemoveRange(tagsToRemove);

                var securityToDelete = Query(FilesDbContext.Security)
                    .Where(r => hashIDs.Any(h => h == r.EntryId));

                FilesDbContext.Security.RemoveRange(securityToDelete);
                FilesDbContext.SaveChanges();

                var mappingToDelete = Query(FilesDbContext.ThirdpartyIdMapping)
                    .Where(r => hashIDs.Any(h => h == r.HashId));

                FilesDbContext.ThirdpartyIdMapping.RemoveRange(mappingToDelete);
                await FilesDbContext.SaveChangesAsync();

                await tx.CommitAsync();
            }
            ProviderInfo.DeleteFolder(folderId);
        }

        public async Task<TTo> MoveFolder<TTo>(string folderId, TTo toFolderId, CancellationToken? cancellationToken)
        {
            if (toFolderId is int tId)
            {
                return (TTo)Convert.ChangeType(await MoveFolder(folderId, tId, cancellationToken), typeof(TTo));
            }

            if (toFolderId is string tsId)
            {
                return (TTo)Convert.ChangeType(await MoveFolder(folderId, tsId, cancellationToken), typeof(TTo));
            }

            throw new NotImplementedException();
        }

        public async Task<int> MoveFolder(string folderId, int toFolderId, CancellationToken? cancellationToken)
        {
            var moved = await CrossDao.PerformCrossDaoFolderCopy(
                    folderId, this, SharePointDaoSelector.GetFileDao(folderId), SharePointDaoSelector.ConvertId,
                    toFolderId, FolderDao, FileDao, r => r,
                    true, cancellationToken);

            return moved.ID;
        }

        public Task<string> MoveFolder(string folderId, string toFolderId, CancellationToken? cancellationToken)
        {
            var newFolderId = ProviderInfo.MoveFolder(folderId, toFolderId);
            UpdatePathInDB(ProviderInfo.MakeId(folderId), newFolderId);
            return Task.FromResult(newFolderId);
        }

        public async Task<Folder<TTo>> CopyFolder<TTo>(string folderId, TTo toFolderId, CancellationToken? cancellationToken)
        {
            if (toFolderId is int tId)
            {
                return await CopyFolder(folderId, tId, cancellationToken) as Folder<TTo>;
            }

            if (toFolderId is string tsId)
            {
                return await CopyFolder(folderId, tsId, cancellationToken) as Folder<TTo>;
            }

            throw new NotImplementedException();
        }

        public Task<Folder<string>> CopyFolder(string folderId, string toFolderId, CancellationToken? cancellationToken)
        {
            return Task.FromResult(ProviderInfo.ToFolder(ProviderInfo.CopyFolder(folderId, toFolderId)));
        }

        public async Task<Folder<int>> CopyFolder(string folderId, int toFolderId, CancellationToken? cancellationToken)
        {
            var moved = await CrossDao.PerformCrossDaoFolderCopy(
                folderId, this, SharePointDaoSelector.GetFileDao(folderId), SharePointDaoSelector.ConvertId,
                toFolderId, FolderDao, FileDao, r => r,
                false, cancellationToken);

            return moved;
        }

        public async Task<IDictionary<string, string>> CanMoveOrCopy<TTo>(string[] folderIds, TTo to)
        {
            if (to is int tId)
            {
                return await CanMoveOrCopy(folderIds, tId);
            }

            if (to is string tsId)
            {
                return await CanMoveOrCopy(folderIds, tsId);
            }

            throw new NotImplementedException();
        }

        public Task<IDictionary<string, string>> CanMoveOrCopy(string[] folderIds, string to)
        {
            return Task.FromResult((IDictionary<string, string>)new Dictionary<string, string>());
        }

        public Task<IDictionary<string, string>> CanMoveOrCopy(string[] folderIds, int to)
        {
            return Task.FromResult((IDictionary<string, string>)new Dictionary<string, string>());
        }

        public Task<string> RenameFolder(Folder<string> folder, string newTitle)
        {
            var oldId = ProviderInfo.MakeId(folder.ID);
            var newFolderId = oldId;
            if (ProviderInfo.SpRootFolderId.Equals(folder.ID))
            {
                //It's root folder
                DaoSelector.RenameProvider(ProviderInfo, newTitle);
                //rename provider customer title
            }
            else
            {
                newFolderId = (string)ProviderInfo.RenameFolder(folder.ID, newTitle);
            }
            UpdatePathInDB(oldId, newFolderId);
            return Task.FromResult(newFolderId);
        }

        public Task<int> GetItemsCount(string folderId)
        {
            throw new NotImplementedException();
        }

        public Task<bool> IsEmpty(string folderId)
        {
            return Task.FromResult(ProviderInfo.GetFolderById(folderId).ItemCount == 0);
        }

        public bool UseTrashForRemove(Folder<string> folder)
        {
            return false;
        }

        public bool UseRecursiveOperation<TTo>(string folderId, TTo toRootFolderId)
        {
            return false;
        }

        public bool UseRecursiveOperation(string folderId, int toRootFolderId)
        {
            return false;
        }

        public bool UseRecursiveOperation(string folderId, string toRootFolderId)
        {
            return false;
        }

        public bool CanCalculateSubitems(string entryId)
        {
            return false;
        }

        public long GetMaxUploadSize(string folderId, bool chunkedUpload = false)
        {
            return 2L * 1024L * 1024L * 1024L;
        }
    }
}