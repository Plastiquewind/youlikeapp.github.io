import * as toastr from "toastr";
import { blockUI, material } from "angular";
import { YouTubeService, CheckingResult } from "../../common/youtube/youtube.service";

import "./main.scss";

export class MainComponent implements ng.IComponentOptions {
    controller: ng.IControllerConstructor;
    template: string;

    constructor() {
        this.controller = MainController;
        this.template = require("./main.html");
    }
}

class MainController implements ng.IComponentController {
    private readonly bottomId: string = "bottom";
    // tslint:disable-next-line:max-line-length
    private readonly listPlaceholder: string = "Пример заполнения:\nhttps://www.youtube.com/watch?v=TadQGyFWPHc\nhttps://www.youtube.com/watch?v=DnQd2wQRoJ0\nqmLJvTiL_Rw";

    private videosList: string;
    private videosListIsEmpty: boolean;
    private lastCheckingResult: CheckingResult;
    private lastSuccessedVideos: string[];
    private lastFailedVideos: { id: string, errorMsg: string }[];

    constructor(private $scope: ng.IScope,
        private $mdDialog: material.IDialogService,
        private $mdMedia: material.IMedia,
        private youtubeService: YouTubeService,
        private blockUI: blockUI.BlockUIService,
        private $location: ng.ILocationService,
        private $anchorScroll: ng.IAnchorScrollService) {
        "ngInject";
    }

    public get hasVideosInStorage(): boolean {
        return localStorage.videosList !== undefined &&
            localStorage.videosList !== null &&
            localStorage.videosList.length > 0;
    }

    $onInit(): void {
        this.$scope.$watch(() => localStorage.videosList, () => {
            this.videosList = localStorage.videosList ? JSON.parse(localStorage.videosList).join("\n") : undefined;
            this.videosListIsEmpty = !this.videosList || this.videosList.length === 0;

            if (this.videosListIsEmpty) {
                this.videosList = this.listPlaceholder;
            }
        });
    }

    public checkVideos(): void {
        this.blockUI.start("Выполняется проверка...");

        this.youtubeService.checkVideos(this.videosList)
            .then((value) => {
                this.clearStats();

                this.lastCheckingResult = value;

                this.$scope.$apply(() => {
                    this.blockUI.stop();

                    if (this.$mdMedia("xs")) {
                        this.goToBottom();
                    }
                });
            }, (reason) => this.$scope.$apply(() => this.blockUI.stop()));
    }

    public setLikes(): void {
        this.blockUI.start("Выполняется проставление лайков...");

        let lastCheckingResult: CheckingResult = this.lastCheckingResult;

        this.clearStats();

        let lastSuccessedVideos: string[] = [];
        let lastFailedVideos: { id: string; errorMsg: string }[] = [];

        try {
            this.youtubeService.setRating(lastCheckingResult.withoutLikes, "like",
            (videoId: string) => {
                lastSuccessedVideos.push(videoId);
            },
            (videoId: string, errorMsg: string) => {
                lastFailedVideos.push({ id: videoId, errorMsg: errorMsg });
            }).then(() => {
                this.lastSuccessedVideos = lastSuccessedVideos;
                this.lastFailedVideos = lastFailedVideos;

                this.$scope.$apply(() => this.blockUI.stop());
            });
        } catch {
            this.clearStats();
            this.blockUI.stop();

            this.lastCheckingResult = lastCheckingResult;
        }
    }

    public saveList(): void {
        localStorage.videosList = JSON.stringify(this.videosList.split("\n"));

        toastr.success("Список видео сохранён.");
    }

    public showDialog(id: string): void {
        this.$mdDialog.show({
            contentElement: `#${id}`,
            parent: document.body
        });

        console.log((<any>this).lastFailedVideosShown);
    }

    public closeDialog(): void {
        this.$mdDialog.hide();
    }

    public clearList(): void {
        this.$mdDialog.hide();
        localStorage.removeItem("videosList");

        toastr.success("Список видео удалён.");
    }

    public loadList(): void {
        this.videosList = (<string[]>JSON.parse(localStorage.videosList)).join("\n");
        this.videosListIsEmpty = false;
    }

    private onListFocus(): void {
        if (this.videosList === this.listPlaceholder) {
            this.videosList = null;
        }
    }

    private onListBlur(): void {
        if (!this.videosList) {
            this.videosList = this.listPlaceholder;
            this.videosListIsEmpty = true;
        }
    }

    private onListChange(): void {
        if (this.videosList) {
            this.videosListIsEmpty = false;
        } else {
            this.videosListIsEmpty = true;
        }
    }

    private clearStats(): void {
        this.lastSuccessedVideos = null;
        this.lastFailedVideos = null;
        this.lastCheckingResult = null;
    }

    private goToBottom(): void {
        this.$location.hash(this.bottomId);

        this.$anchorScroll();
    }

    private forceUpdate(): void {
        this.$scope.$eval();
    }
}