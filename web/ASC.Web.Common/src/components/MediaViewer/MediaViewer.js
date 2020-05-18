import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import { Icons } from "asc-web-components";

import ImageViewer from "./sub-components/image-viewer"
import VideoViewer from "./sub-components/video-viewer"
import MediaScrollButton from "./sub-components/scroll-button"
import ControlBtn from "./sub-components/control-btn"
import isEqual from "lodash/isEqual";

const StyledVideoViewer = styled(VideoViewer)`
    z-index: 4001;
`
const StyledMediaViewer = styled.div`
    
    color: #d1d1d1;
    display: ${props => props.visible ? "block" : "none"};
    overflow: hidden;
    .videoViewerOverlay{
        position: fixed;
        z-index: 4000;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: black;
        opacity: 0.5;
    }
    .mediaViewerToolbox{
        z-index: 4001;
        padding-top: 14px;
        padding-bottom: 14px;
        height: 20px;
        width: 100%;
        background-color: rgba(11,11,11,0.7);
        position: fixed;
        bottom: 0;
        left: 0;
        text-align: center;
    }
    span{
        position: fixed;
        right: 0;
        bottom: 5px;
        margin-right: 10px;
        z-index: 4005;

        .deleteBtnContainer{
            display: block;
            width: 20px;
            margin: 3px 10px;
            line-height: 19px;
        }

        .downloadBtnContainer{
            display: block;
            width: 20px;
            margin: 3px 10px;
            line-height: 19px;
        }
    }
    .details{
        z-index: 4001;
        font-size: 14px;
        font-weight: bold;
        text-align: center;
        white-space: nowrap;
        padding-top: 14px;
        padding-bottom: 14px;
        height: 20px;
        width: 100%;
        background: rgba(17,17,17,0.867);
        position: fixed;
        top: 0;
        left: 0;
    }

    .mediaPlayerClose{
        position: fixed;
        top: 4px;
        right: 10px;
        height: 30px;
    }
  
`;

var audio = 1;
var video = 2;
class MediaViewer extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            visible: this.props.visible,
            allowConvert: true,
            playlist: this.props.playlist,
            playlistPos: 0,
        };

        this.detailsContainer = React.createRef();
        this.viewerToolbox = React.createRef();
    }

    componentDidUpdate(prevProps) {
        if (this.props.visible !== prevProps.visible) {
            this.setState(
                {
                    visible: this.props.visible,
                    playlistPos: this.props.playlist.length > 0 ? this.props.playlist.find(file => file.fileId === this.props.currentFileId).id : 0
                }
            );
        }
        if (this.props.visible == true && this.props.visible === prevProps.visible && !isEqual(this.props.playlist, prevProps.playlist)) {
            let playlistPos = 0;
            if (this.props.playlist.length > 0) {
                if (this.props.playlist.length - 1 < this.state.playlistPos) {
                    playlistPos = this.props.playlist.length - 1;
                }
                this.setState(
                    {
                        playlist: this.props.playlist,
                        playlistPos: playlistPos
                    }
                );
            } else {
                this.props.onEmptyPlaylistError();
                this.setState(
                    {
                        visible: false
                    }
                );
            }
        }

    }
    mapSupplied = {
        ".aac": { supply: "m4a", type: audio },
        ".flac": { supply: "mp3", type: audio },
        ".m4a": { supply: "m4a", type: audio },
        ".mp3": { supply: "mp3", type: audio },
        ".oga": { supply: "oga", type: audio },
        ".ogg": { supply: "oga", type: audio },
        ".wav": { supply: "wav", type: audio },

        ".f4v": { supply: "m4v", type: video },
        ".m4v": { supply: "m4v", type: video },
        ".mov": { supply: "m4v", type: video },
        ".mp4": { supply: "m4v", type: video },
        ".ogv": { supply: "ogv", type: video },
        ".webm": { supply: "webmv", type: video },
        ".wmv": { supply: "m4v", type: video, convertable: true },
        ".avi": { supply: "m4v", type: video, convertable: true },
        ".mpeg": { supply: "m4v", type: video, convertable: true },
        ".mpg": { supply: "m4v", type: video, convertable: true }
    };

    canImageView = function (ext) {
        return this.props.extsImagePreviewed.indexOf(ext) != -1;
    };
    canPlay = (fileTitle, allowConvert) => {

        var ext = fileTitle[0] === "." ? fileTitle : this.getFileExtension(fileTitle);

        var supply = this.mapSupplied[ext];

        var canConv = allowConvert || this.props.allowConvert;

        return !!supply && this.props.extsMediaPreviewed.indexOf(ext) != -1
            && (!supply.convertable || canConv);
    };

    getFileExtension = (fileTitle) => {
        if (typeof fileTitle == "undefined" || fileTitle == null) {
            return "";
        }
        fileTitle = fileTitle.trim();
        var posExt = fileTitle.lastIndexOf(".");
        return 0 <= posExt ? fileTitle.substring(posExt).trim().toLowerCase() : "";
    };

    prevMedia = () => {

        let currentPlaylistPos = this.state.playlistPos;
        currentPlaylistPos--;
        if (currentPlaylistPos < 0)
            currentPlaylistPos = this.state.playlist.length - 1;

        this.setState({
            playlistPos: currentPlaylistPos
        });

    };

    nextMedia = () => {

        let currentPlaylistPos = this.state.playlistPos;
        currentPlaylistPos = (currentPlaylistPos + 1) % this.state.playlist.length;

        this.setState({
            playlistPos: currentPlaylistPos
        });
    };
    getOffset = () => {
        if (this.detailsContainer.current && this.viewerToolbox.current) {
            return this.detailsContainer.current.offsetHeight + this.viewerToolbox.current.offsetHeight;
        } else {
            return 0;
        }
    }
    render() {

        let currentPlaylistPos = this.state.playlistPos;
        let currentFileId = this.state.playlist.length > 0 ? this.state.playlist.find(file => file.id === currentPlaylistPos).fileId : 0;

        let fileTitle = this.state.playlist[currentPlaylistPos].title;
        let url = this.state.playlist[currentPlaylistPos].src;
        let isImage = false;
        let isVideo = false;
        let canOpen = true;

        var ext = this.getFileExtension(fileTitle) ? this.getFileExtension(fileTitle) : this.getFileExtension(url);

        if (!this.canPlay(ext) && !this.canImageView(ext)) {
            canOpen = false;
            this.props.onError && this.props.onError();
        }

        if (this.canImageView(ext)) {
            isImage = true;
        } else {
            isImage = false;
            isVideo = this.mapSupplied[ext] ? this.mapSupplied[ext].type == video : false;
        }

        if (this.mapSupplied[ext])
            if (!isImage && this.mapSupplied[ext].convertable && !url.includes("#")) {
                url += (url.includes("?") ? "&" : "?") + "convpreview=true";
            }

        return (
            <StyledMediaViewer visible={this.state.visible}>

                <div className="videoViewerOverlay"></div>
                <MediaScrollButton orientation="right" onClick={this.prevMedia} />
                <MediaScrollButton orientation="left" onClick={this.nextMedia} />
                <div>
                    <div className="details" ref={this.detailsContainer}>
                        <div className="title">{fileTitle}</div>
                        <ControlBtn onClick={this.props.onClose && (() => { this.props.onClose() })} className="mediaPlayerClose">
                            <Icons.CrossIcon size="medium" isfill={true} color="#fff" />
                        </ControlBtn>
                    </div>
                </div>
                {canOpen &&
                    (
                        isImage ?
                            <ImageViewer
                                visible={this.state.visible}
                                onClose={() => { this.setState({ visible: false }); }}
                                images={[
                                    { src: url, alt: '' }
                                ]}
                            />
                            :
                            <StyledVideoViewer url={url} playing={this.state.visible} isVideo={isVideo} getOffset={this.getOffset} />
                    )
                }
                <div className="mediaViewerToolbox" ref={this.viewerToolbox}>
                    <span>
                        {
                            this.props.canDelete(currentFileId) &&
                            <ControlBtn onClick={this.props.onDelete && (() => { this.props.onDelete(currentFileId) })}>
                                <div className="deleteBtnContainer">
                                    <Icons.MediaDeleteIcon size="scale" />
                                </div>
                            </ControlBtn>
                        }
                        {
                            this.props.canDownload(currentFileId) &&
                            <ControlBtn onClick={this.props.onDownload && (() => { this.props.onDownload(currentFileId) })}>
                                <div className="downloadBtnContainer">
                                    <Icons.MediaDownloadIcon size="scale" />
                                </div>
                            </ControlBtn>
                        }
                    </span>
                </div>

            </StyledMediaViewer>
        )
    }
}

MediaViewer.propTypes = {
    allowConvert: PropTypes.bool,
    visible: PropTypes.bool,
    currentFileId: PropTypes.number,
    playlist: PropTypes.arrayOf(PropTypes.object),
    extsImagePreviewed: PropTypes.arrayOf(PropTypes.string),
    extsMediaPreviewed: PropTypes.arrayOf(PropTypes.string),
    onError: PropTypes.func,
    canDelete: PropTypes.func,
    canDownload: PropTypes.func,
    onDelete: PropTypes.func,
    onDownload: PropTypes.func,
    onClose: PropTypes.func,
    onEmptyPlaylistError: PropTypes.func
}

MediaViewer.defaultProps = {
    currentFileId: 0,
    allowConvert: true,
    canDelete: () => { return true },
    canDownload: () => { return true }
}

export default MediaViewer;