cd web/ASC.Web.Client
yarn link -r ../../packages/asc-web-components
yarn link -r ../../packages/asc-web-common
yarn install
yarn run build
cd ../../