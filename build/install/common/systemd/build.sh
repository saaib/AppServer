#!/bin/bash

PRODUCT="onlyoffice/appserver"
BASE_DIR="/etc/${PRODUCT}"
PATH_TO_CONF="${BASE_DIR}"
STORAGE_ROOT="${BASE_DIR}/data"
LOG_DIR="/var/log/${PRODUCT}"
DOTNET_RUN="/usr/bin/dotnet"
APP_URLS="http://0.0.0.0"
ENVIRONMENT=" --ENVIRONMENT=production"

service_name=(
	api
	api_system
	urlshortener
	thumbnails
	socket
	studio_notify
	notify 
	people
	files
	files_service
	studio
	backup)

SERVICE_PORT="" 
SERVICE_NAME=""
WORK_DIR=""
EXEC_FILE=""
CORE=""

reassign_values (){
  case $1 in
	api )	
		SERVICE_NAME="$1"
		SERVICE_PORT="5000"
		WORK_DIR="/var/www/appserver/studio/api/"
		EXEC_FILE="ASC.Web.Api.dll"
	;;
	api_system )	
		SERVICE_NAME="$1"
		SERVICE_PORT="5010"
		WORK_DIR="/var/www/appserver/services/apisystem/"
		EXEC_FILE="ASC.ApiSystem.dll"
	;;
	urlshortener )
		SERVICE_NAME="$1"
		SERVICE_PORT="5015"
		WORK_DIR="/services/ASC.UrlShortener/service/"
		EXEC_FILE="ASC.UrlShortener.Svc.dll"
	;;
	thumbnails )	
		SERVICE_NAME="$1"
		SERVICE_PORT="5016"
		WORK_DIR="/services/ASC.Thumbnails/service/"
		EXEC_FILE="ASC.Thumbnails.Svc.dll"
	;;
	socket )	
		SERVICE_NAME="$1"
		SERVICE_PORT="9999"
		WORK_DIR="/services/ASC.Socket.IO/service/"
		EXEC_FILE="ASC.Socket.IO.Svc.dll"
	;;
	studio_notify )
		SERVICE_NAME="$1"
		SERVICE_PORT="5006"
		WORK_DIR="/var/www/appserver/services/studio.notify/"
		EXEC_FILE="ASC.Studio.Notify.dll"
		CORE=" --core:products:folder=/var/www/appserver/products --core:products:subfolder=server "
	;;
	notify )
		SERVICE_NAME="$1"
		SERVICE_PORT="5005"
		WORK_DIR="/var/www/appserver/services/notify/"
		EXEC_FILE="ASC.Notify.dll"
		CORE=" --core:products:folder=/var/www/appserver/products --core:products:subfolder=server "
	;;
	people )
		SERVICE_NAME="$1"
		SERVICE_PORT="5004"
		WORK_DIR="/var/www/appserver/products/ASC.People/server/"
		EXEC_FILE="ASC.People.dll"
	;;
	files )
		SERVICE_NAME="$1"
		SERVICE_PORT="5007"
		WORK_DIR="/var/www/appserver/products/ASC.Files/server/"
		EXEC_FILE="ASC.Files.dll"
	;;
	files_service )
		SERVICE_NAME="$1"
		SERVICE_PORT="5009"
		WORK_DIR="/var/www/appserver/products/ASC.Files/service/"
		EXEC_FILE="ASC.Files.Service.dll"
		CORE=" --core:products:folder=/var/www/appserver/products --core:products:subfolder=server"
	;;
	studio )
		SERVICE_NAME="$1"
		SERVICE_PORT="5003"
		WORK_DIR="/var/www/appserver/studio/server/"
		EXEC_FILE="ASC.Web.Studio.dll"
	;;
	backup )
		SERVICE_NAME="$1"
		SERVICE_PORT="5012"
		WORK_DIR="/var/www/appserver/services/backup/"
		EXEC_FILE="ASC.Data.Backup.dll"
		CORE=" --core:products:folder=/var/www/appserver/products --core:products:subfolder=server"
	;;
  esac
  
  EXEC_START="${DOTNET_RUN} ${WORK_DIR}${EXEC_FILE} --urls=${APP_URLS}:${SERVICE_PORT} --pathToConf=${PATH_TO_CONF} --'\$STORAGE_ROOT'=${STORAGE_ROOT} --log:dir=${LOG_DIR} --log:name=${SERVICE_NAME}${CORE}${ENVIRONMENT}"
}

write_to_file () {
  sed -i -e 's#${SERVICE_NAME}#'$SERVICE_NAME'#g' -e 's#${WORK_DIR}#'$WORK_DIR'#g' -e \
  "s#\${EXEC_START}#$EXEC_START#g" modules/appserver-${service_name[$i]}.service
}

mkdir -p modules

for i in ${!service_name[@]}; do
  cp service ./modules/appserver-${service_name[$i]}.service
  reassign_values "${service_name[$i]}"
  write_to_file $i
done
