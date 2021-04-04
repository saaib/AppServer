%build

cd %{_builddir}/AppServer-%GIT_BRANCH/build/install/common/systemd/
bash build.sh

cd %{_builddir}/AppServer-%GIT_BRANCH/
yarn install --cwd web/ASC.Web.Components --frozen-lockfile > build/ASC.Web.Components.log
yarn pack --cwd web/ASC.Web.Components
	
cd %{_builddir}/AppServer-%GIT_BRANCH/
component=$(ls web/ASC.Web.Components/asc-web-components-v1.*.tgz)
yarn remove asc-web-components --cwd web/ASC.Web.Common --peer
yarn add file:../../$component --cwd web/ASC.Web.Common --cache-folder ../../yarn --peer
yarn install --cwd web/ASC.Web.Common --frozen-lockfile > build/ASC.Web.Common.log
yarn pack --cwd web/ASC.Web.Common

cd %{_builddir}/AppServer-%GIT_BRANCH/
npm run-script build:storybook --prefix web/ASC.Web.Components

cd %{_builddir}/AppServer-%GIT_BRANCH/
component=$(ls web/ASC.Web.Components/asc-web-components-v1.*.tgz)
common=$(ls web/ASC.Web.Common/asc-web-common-v1.*.tgz)
yarn remove asc-web-components asc-web-common --cwd web/ASC.Web.Client
yarn add ../../$component --cwd web/ASC.Web.Client --cache-folder ../../yarn
yarn add ../../$common --cwd web/ASC.Web.Client --cache-folder ../../yarn
yarn install --cwd web/ASC.Web.Client --frozen-lockfile || (cd web/ASC.Web.Client \
npm i && cd ../../)
npm run-script build --prefix web/ASC.Web.Client

cd %{_builddir}/AppServer-%GIT_BRANCH/
component=$(ls  web/ASC.Web.Components/asc-web-components-v1.*.tgz)
common=$(ls web/ASC.Web.Common/asc-web-common-v1.*.tgz)
yarn remove asc-web-components asc-web-common --cwd products/ASC.Files/Client
yarn add ../../../$component --cwd products/ASC.Files/Client --cache-folder ../../../yarn
yarn add ../../../$common --cwd products/ASC.Files/Client --cache-folder ../../../yarn
yarn install --cwd products/ASC.Files/Client --frozen-lockfile || (cd products/ASC.Files/Client \
npm i && cd ../../../)
npm run-script build --prefix products/ASC.Files/Client

cd %{_builddir}/AppServer-%GIT_BRANCH/
component=$(ls  web/ASC.Web.Components/asc-web-components-v1.*.tgz)
common=$(ls web/ASC.Web.Common/asc-web-common-v1.*.tgz)
yarn remove asc-web-components asc-web-common --cwd products/ASC.People/Client
yarn add ../../../$component --cwd products/ASC.People/Client --cache-folder ../../../yarn
yarn add ../../../$common --cwd products/ASC.People/Client --cache-folder ../../../yarn
yarn install --cwd products/ASC.People/Client --frozen-lockfile || (cd products/ASC.People/Client \
npm i && cd ../../../)
npm run-script build --prefix products/ASC.People/Client

cd %{_builddir}/AppServer-%GIT_BRANCH/
dotnet restore ASC.Web.sln --configfile .nuget/NuGet.Config
dotnet build -r linux-x64 ASC.Web.sln
cd products/ASC.People/Server
dotnet -d publish --no-build --self-contained -r linux-x64 -o %{_builddir}%{_var}/www/appserver/products/ASC.People/server
cd ../../../
cd products/ASC.Files/Server
dotnet -d publish --no-build --self-contained -r linux-x64 -o %{_builddir}%{_var}/www/appserver/products/ASC.Files/server
cp -avrf DocStore %{_builddir}%{_var}/www/appserver/products/ASC.Files/server/
cd ../../../
cd products/ASC.Files/Service
dotnet -d publish --no-build --self-contained -r linux-x64 -o %{_builddir}%{_var}/www/appserver/products/ASC.Files/service
cd ../../../
cd web/ASC.Web.Api
dotnet -d publish --no-build --self-contained -r linux-x64 -o %{_builddir}%{_var}/www/appserver/studio/api
cd ../../
cd web/ASC.Web.Studio
dotnet -d publish --no-build --self-contained -r linux-x64 -o %{_builddir}%{_var}/www/appserver/studio/server
cd ../../
cd common/services/ASC.Data.Backup
dotnet -d publish --no-build --self-contained -r linux-x64 -o %{_builddir}%{_var}/www/appserver/services/backup
cd ../../../
cd common/services/ASC.Notify
dotnet -d publish --no-build --self-contained -r linux-x64 -o %{_builddir}%{_var}/www/appserver/services/notify
cd ../../../
cd common/services/ASC.ApiSystem
dotnet -d publish --no-build --self-contained -r linux-x64 -o %{_builddir}%{_var}/www/appserver/services/apisystem
cd ../../../
cd common/services/ASC.Thumbnails.Svc
dotnet -d publish --no-build --self-contained -r linux-x64 -o %{_builddir}/services/thumb/service
cd ../../../

yarn install --cwd common/ASC.Thumbnails --frozen-lockfile

cd common/services/ASC.UrlShortener.Svc
dotnet -d publish --no-build --self-contained -r linux-x64 -o %{_builddir}/services/urlshortener/service
cd ../../../
yarn install --cwd common/ASC.UrlShortener --frozen-lockfile

cd common/services/ASC.Socket.IO.Svc
dotnet -d publish --no-build --self-contained -r linux-x64 -o %{_builddir}/services/socket/service
cd ../../../
yarn install --cwd common/ASC.Socket.IO --frozen-lockfile

cd common/services/ASC.Studio.Notify
dotnet add ASC.Studio.Notify.csproj reference ../../../products/ASC.People/Server/ASC.People.csproj  ../../../products/ASC.Files/Server/ASC.Files.csproj
dotnet -d publish --no-build --self-contained -r linux-x64 -o %{_builddir}%{_var}/www/appserver/services/studio.notify
cd ../../../

sed -i "s@var/www@var/www/appserver@" config/nginx/onlyoffice-*.conf
