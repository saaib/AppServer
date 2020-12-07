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
using System.IO;
using System.Linq;
using System.Threading.Tasks;

using ASC.Common;
using ASC.Common.Logging;
using ASC.Core;
using ASC.Core.Common.EF;
using ASC.Core.Tenants;
using ASC.Files.Core;
using ASC.Files.Core.EF;
using ASC.Files.Core.Resources;
using ASC.Files.Core.Thirdparty;
using ASC.Web.Core.Files;
using ASC.Web.Studio.Core;

using Microsoft.Extensions.Options;

namespace ASC.Files.Thirdparty.SharePoint
{
    [Scope]
    internal class SharePointFileDao : SharePointDaoBase, IFileDao<string>
    {
        private CrossDao CrossDao { get; }
        private SharePointDaoSelector SharePointDaoSelector { get; }
        private IFileDao<int> FileDao { get; }

        public SharePointFileDao(
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
            IFileDao<int> fileDao)
            : base(serviceProvider, userManager, tenantManager, tenantUtil, dbContextManager, setupInfo, monitor, fileUtility)
        {
            CrossDao = crossDao;
            SharePointDaoSelector = sharePointDaoSelector;
            FileDao = fileDao;
        }

        public void InvalidateCache(string fileId)
        {
            ProviderInfo.InvalidateStorage();
        }

        public Task<File<string>> GetFile(string fileId)
        {
            return GetFile(fileId, 1);
        }

        public Task<File<string>> GetFile(string fileId, int fileVersion)
        {
            return Task.FromResult(ProviderInfo.ToFile(ProviderInfo.GetFileById(fileId)));
        }

        public Task<File<string>> GetFile(string parentId, string title)
        {
            return Task.FromResult(ProviderInfo.ToFile(ProviderInfo.GetFolderFiles(parentId).FirstOrDefault(item => item.Name.Equals(title, StringComparison.InvariantCultureIgnoreCase))));
        }

        public Task<File<string>> GetFileStable(string fileId, int fileVersion)
        {
            return Task.FromResult(ProviderInfo.ToFile(ProviderInfo.GetFileById(fileId)));
        }

        public async Task<List<File<string>>> GetFileHistory(string fileId)
        {
            return new List<File<string>> { await GetFile(fileId) };
        }

        public Task<List<File<string>>> GetFiles(IEnumerable<string> fileIds)
        {
            return Task.FromResult(fileIds.Select(fileId => ProviderInfo.ToFile(ProviderInfo.GetFileById(fileId))).ToList());
        }

        public async Task<List<File<string>>> GetFilesFiltered(IEnumerable<string> fileIds, FilterType filterType, bool subjectGroup, Guid subjectID, string searchText, bool searchInContent)
        {
            if (fileIds == null || !fileIds.Any() || filterType == FilterType.FoldersOnly) return new List<File<string>>();

            var files = (await GetFiles(fileIds)).AsEnumerable();

            //Filter
            if (subjectID != Guid.Empty)
            {
                files = files.Where(x => subjectGroup
                                             ? UserManager.IsUserInGroup(x.CreateBy, subjectID)
                                             : x.CreateBy == subjectID);
            }

            switch (filterType)
            {
                case FilterType.FoldersOnly:
                    return new List<File<string>>();
                case FilterType.DocumentsOnly:
                    files = files.Where(x => FileUtility.GetFileTypeByFileName(x.Title) == FileType.Document);
                    break;
                case FilterType.PresentationsOnly:
                    files = files.Where(x => FileUtility.GetFileTypeByFileName(x.Title) == FileType.Presentation);
                    break;
                case FilterType.SpreadsheetsOnly:
                    files = files.Where(x => FileUtility.GetFileTypeByFileName(x.Title) == FileType.Spreadsheet);
                    break;
                case FilterType.ImagesOnly:
                    files = files.Where(x => FileUtility.GetFileTypeByFileName(x.Title) == FileType.Image);
                    break;
                case FilterType.ArchiveOnly:
                    files = files.Where(x => FileUtility.GetFileTypeByFileName(x.Title) == FileType.Archive);
                    break;
                case FilterType.MediaOnly:
                    files = files.Where(x =>
                        {
                            FileType fileType;
                            return (fileType = FileUtility.GetFileTypeByFileName(x.Title)) == FileType.Audio || fileType == FileType.Video;
                        });
                    break;
                case FilterType.ByExtension:
                    if (!string.IsNullOrEmpty(searchText))
                        files = files.Where(x => FileUtility.GetFileExtension(x.Title).Contains(searchText));
                    break;
            }

            if (!string.IsNullOrEmpty(searchText))
                files = files.Where(x => x.Title.IndexOf(searchText, StringComparison.OrdinalIgnoreCase) != -1);

            return files.ToList();
        }

        public Task<List<string>> GetFiles(string parentId)
        {
            return Task.FromResult(ProviderInfo.GetFolderFiles(parentId).Select(r => ProviderInfo.ToFile(r).ID).ToList());
        }

        public Task<List<File<string>>> GetFiles(string parentId, OrderBy orderBy, FilterType filterType, bool subjectGroup, Guid subjectID, string searchText, bool searchInContent, bool withSubfolders = false)
        {
            if (filterType == FilterType.FoldersOnly) return Task.FromResult(new List<File<string>>());

            //Get only files
            var files = ProviderInfo.GetFolderFiles(parentId).Select(r => ProviderInfo.ToFile(r));

            //Filter
            if (subjectID != Guid.Empty)
            {
                files = files.Where(x => subjectGroup
                                             ? UserManager.IsUserInGroup(x.CreateBy, subjectID)
                                             : x.CreateBy == subjectID);
            }

            switch (filterType)
            {
                case FilterType.FoldersOnly:
                    return Task.FromResult(new List<File<string>>());
                case FilterType.DocumentsOnly:
                    files = files.Where(x => FileUtility.GetFileTypeByFileName(x.Title) == FileType.Document).ToList();
                    break;
                case FilterType.PresentationsOnly:
                    files = files.Where(x => FileUtility.GetFileTypeByFileName(x.Title) == FileType.Presentation).ToList();
                    break;
                case FilterType.SpreadsheetsOnly:
                    files = files.Where(x => FileUtility.GetFileTypeByFileName(x.Title) == FileType.Spreadsheet).ToList();
                    break;
                case FilterType.ImagesOnly:
                    files = files.Where(x => FileUtility.GetFileTypeByFileName(x.Title) == FileType.Image).ToList();
                    break;
                case FilterType.ArchiveOnly:
                    files = files.Where(x => FileUtility.GetFileTypeByFileName(x.Title) == FileType.Archive).ToList();
                    break;
                case FilterType.MediaOnly:
                    files = files.Where(x =>
                    {
                        FileType fileType;
                        return (fileType = FileUtility.GetFileTypeByFileName(x.Title)) == FileType.Audio || fileType == FileType.Video;
                    });
                    break;
                case FilterType.ByExtension:
                    if (!string.IsNullOrEmpty(searchText))
                        files = files.Where(x => FileUtility.GetFileExtension(x.Title).Contains(searchText));
                    break;
            }

            if (!string.IsNullOrEmpty(searchText))
                files = files.Where(x => x.Title.IndexOf(searchText, StringComparison.OrdinalIgnoreCase) != -1).ToList();

            if (orderBy == null) orderBy = new OrderBy(SortedByType.DateAndTime, false);

            files = orderBy.SortedBy switch
            {
                SortedByType.Author => orderBy.IsAsc ? files.OrderBy(x => x.CreateBy) : files.OrderByDescending(x => x.CreateBy),
                SortedByType.AZ => orderBy.IsAsc ? files.OrderBy(x => x.Title) : files.OrderByDescending(x => x.Title),
                SortedByType.DateAndTime => orderBy.IsAsc ? files.OrderBy(x => x.ModifiedOn) : files.OrderByDescending(x => x.ModifiedOn),
                SortedByType.DateAndTimeCreation => orderBy.IsAsc ? files.OrderBy(x => x.CreateOn) : files.OrderByDescending(x => x.CreateOn),
                _ => orderBy.IsAsc ? files.OrderBy(x => x.Title) : files.OrderByDescending(x => x.Title),
            };
            return Task.FromResult(files.ToList());
        }

        public Stream GetFileStream(File<string> file)
        {
            return GetFileStream(file, 0);
        }

        public Stream GetFileStream(File<string> file, long offset)
        {
            var fileToDownload = ProviderInfo.GetFileById(file.ID);
            if (fileToDownload == null)
                throw new ArgumentNullException("file", FilesCommonResource.ErrorMassage_FileNotFound);

            var fileStream = ProviderInfo.GetFileStream(fileToDownload.ServerRelativeUrl, (int)offset);

            return fileStream;
        }

        public Uri GetPreSignedUri(File<string> file, TimeSpan expires)
        {
            throw new NotSupportedException();
        }

        public bool IsSupportedPreSignedUri(File<string> file)
        {
            return false;
        }

        public async Task<File<string>> SaveFile(File<string> file, Stream fileStream)
        {
            if (fileStream == null) throw new ArgumentNullException("fileStream");

            if (file.ID != null)
            {
                var sharePointFile = ProviderInfo.CreateFile(file.ID, fileStream);

                var resultFile = ProviderInfo.ToFile(sharePointFile);
                if (!sharePointFile.Name.Equals(file.Title))
                {
                    var folder = ProviderInfo.GetFolderById(file.FolderID);
                    file.Title = await GetAvailableTitle(file.Title, folder, IsExist);

                    var id = ProviderInfo.RenameFile(DaoSelector.ConvertId(resultFile.ID).ToString(), file.Title);
                    return await GetFile(DaoSelector.ConvertId(id));
                }
                return resultFile;
            }

            if (file.FolderID != null)
            {
                var folder = ProviderInfo.GetFolderById(file.FolderID);
                file.Title = await GetAvailableTitle(file.Title, folder, IsExist);
                return ProviderInfo.ToFile(ProviderInfo.CreateFile(folder.ServerRelativeUrl + "/" + file.Title, fileStream));
            }

            return null;
        }

        public async Task<File<string>> ReplaceFileVersion(File<string> file, Stream fileStream)
        {
            return await SaveFile(file, fileStream);
        }

        public Task DeleteFile(string fileId)
        {
            ProviderInfo.DeleteFile(fileId);
            return Task.CompletedTask;
        }

        public Task<bool> IsExist(string title, object folderId)
        {
            return Task.FromResult(ProviderInfo.GetFolderFiles(folderId)
                .Any(item => item.Name.Equals(title, StringComparison.InvariantCultureIgnoreCase)));
        }

        public bool IsExist(string title, Microsoft.SharePoint.Client.Folder folder)
        {
            return ProviderInfo.GetFolderFiles(folder.ServerRelativeUrl)
                .Any(item => item.Name.Equals(title, StringComparison.InvariantCultureIgnoreCase));
        }

        public async Task<TTo> MoveFile<TTo>(string fileId, TTo toFolderId)
        {
            if (toFolderId is int tId)
            {
                return (TTo)Convert.ChangeType(await MoveFile(fileId, tId), typeof(TTo));
            }

            if (toFolderId is string tsId)
            {
                return (TTo)Convert.ChangeType(await MoveFile(fileId, tsId), typeof(TTo));
            }

            throw new NotImplementedException();
        }

        public async Task<int> MoveFile(string fileId, int toFolderId)
        {
            var moved = await CrossDao.PerformCrossDaoFileCopy(
                fileId, this, SharePointDaoSelector.ConvertId,
                toFolderId, FileDao, r => r,
                true);

            return moved.ID;
        }

        public Task<string> MoveFile(string fileId, string toFolderId)
        {
            var newFileId = ProviderInfo.MoveFile(fileId, toFolderId);
            UpdatePathInDB(ProviderInfo.MakeId(fileId), newFileId);
            return Task.FromResult(newFileId);
        }

        public async Task<File<TTo>> CopyFile<TTo>(string fileId, TTo toFolderId)
        {
            if (toFolderId is int tId)
            {
                return await CopyFile(fileId, tId) as File<TTo>;
            }

            if (toFolderId is string tsId)
            {
                return await CopyFile(fileId, tsId) as File<TTo>;
            }

            throw new NotImplementedException();
        }

        public async Task<File<int>> CopyFile(string fileId, int toFolderId)
        {
            var moved = await CrossDao.PerformCrossDaoFileCopy(
                fileId, this, SharePointDaoSelector.ConvertId,
                toFolderId, FileDao, r => r,
                false);

            return moved;
        }

        public Task<File<string>> CopyFile(string fileId, string toFolderId)
        {
            return Task.FromResult(ProviderInfo.ToFile(ProviderInfo.CopyFile(fileId, toFolderId)));
        }

        public Task<string> FileRename(File<string> file, string newTitle)
        {
            var newFileId = ProviderInfo.RenameFile(file.ID, newTitle);
            UpdatePathInDB(ProviderInfo.MakeId(file.ID), newFileId);
            return Task.FromResult(newFileId);
        }

        public Task<string> UpdateComment(string fileId, int fileVersion, string comment)
        {
            return Task.FromResult(string.Empty);
        }

        public Task CompleteVersion(string fileId, int fileVersion)
        {
            return Task.CompletedTask;
        }

        public Task ContinueVersion(string fileId, int fileVersion)
        {
            return Task.CompletedTask;
        }

        public bool UseTrashForRemove(File<string> file)
        {
            return false;
        }

        public Task<ChunkedUploadSession<string>> CreateUploadSession(File<string> file, long contentLength)
        {
            return Task.FromResult(new ChunkedUploadSession<string>(FixId(file), contentLength) { UseChunks = false });
        }

        public async Task UploadChunk(ChunkedUploadSession<string> uploadSession, Stream chunkStream, long chunkLength)
        {
            if (!uploadSession.UseChunks)
            {
                if (uploadSession.BytesTotal == 0)
                    uploadSession.BytesTotal = chunkLength;

                uploadSession.File = await SaveFile(uploadSession.File, chunkStream);
                uploadSession.BytesUploaded = chunkLength;
                return;
            }

            throw new NotImplementedException();
        }

        public void AbortUploadSession(ChunkedUploadSession<string> uploadSession)
        {
            //throw new NotImplementedException();
        }

        private File<string> FixId(File<string> file)
        {
            if (file.ID != null)
                file.ID = ProviderInfo.MakeId(file.ID);

            if (file.FolderID != null)
                file.FolderID = ProviderInfo.MakeId(file.FolderID);

            return file;
        }
        }
}
