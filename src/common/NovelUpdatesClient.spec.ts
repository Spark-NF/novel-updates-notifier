// tslint:disable:max-line-length

import * as ajax from "./ajax";
import { NovelUpdatesClient } from "./NovelUpdatesClient";

jest.mock("./ajax");

describe("NovelUpdatesClient", () => {
    function setLoginStatus(loggedIn: boolean) {
        window.browser = {
            cookies: {
                getAll() {
                    return loggedIn ? [{
                        name: "wordpress_logged_in_someRandomHash",
                        value: "usernme|someStuff",
                    }] : [];
                },
            },
        } as any;
    }

    function setUpAjax(responses: { [url: string]: string | number } | Array<string | number>) {
        let index = 0;
        (ajax as any).ajax.mockImplementation((url: string) => {
            const response = Array.isArray(responses) ? responses[index++] : responses[url] || responses["*"];
            if (response !== undefined) {
                if (typeof response === "number") {
                    return Promise.resolve({ status: response });
                }
                return Promise.resolve({ responseText: response });
            }

            // tslint:disable-next-line:no-console
            console.log(`Unexpected Ajax call to '${url}'`);
        });
    }

    describe("checkLoginStatus", () => {
        it("Returns false if the user is not logged in", async () => {
            setLoginStatus(false);
            const client = new NovelUpdatesClient(undefined);
            const status = await client.checkLoginStatus();
            expect(status).toBe(false);
        });

        it("Returns true if the user is logged in", async () => {
            setLoginStatus(true);
            const client = new NovelUpdatesClient(undefined);
            const status = await client.checkLoginStatus();
            expect(status).toBe(true);
        });
    });

    describe("search", () => {
        it("Returns the search results as structured objects", async () => {
            setUpAjax([
                '<ul><li class="search_li_results"><a class="a_search" href="https://www.novelupdates.com/series/martial-world/"><img class="search_profile_image" src="//cdn.novelupdates.com/img/series_2072.jpg"><span style="width: 80%;white-space: nowrap;overflow: hidden;text-overflow: ellipsis;display: inline-block;">\
                <span class="search_hl">Martial World</span>\
                </span></a></li><li class="search_li_results"><a class="a_search" href="https://www.novelupdates.com/series/true-martial-world/"><img class="search_profile_image" src="//cdn.novelupdates.com/img/series_4010.jpg"><span style="width: 80%;white-space: nowrap;overflow: hidden;text-overflow: ellipsis;display: inline-block;">\
                True <span class="search_hl">Martial World</span>\
                </span></a></li></ul>0',
            ]);

            const client = new NovelUpdatesClient(undefined);
            const results = await client.search("Martial World");

            expect(results.length).toBe(2);
            expect(results[0].name).toBe("Martial World");
            expect(results[0].html).toBe('<span class="search_hl">Martial World</span>');
            expect(results[0].url).toBe("https://www.novelupdates.com/series/martial-world/");
            expect(results[0].img).toBe("https://cdn.novelupdates.com/img/series_2072.jpg");
            expect(results[1].name).toBe("True Martial World");
            expect(results[1].html).toBe('True <span class="search_hl">Martial World</span>');
            expect(results[1].url).toBe("https://www.novelupdates.com/series/true-martial-world/");
            expect(results[1].img).toBe("https://cdn.novelupdates.com/img/series_4010.jpg");
        });
    });

    describe("getIdFromUrl", () => {
        it("Returns a novel ID from its details page", async () => {
            setUpAjax([
                '<link rel="stylesheet" href="https://www.novelupdates.com/wp-content/themes/ndupdates-child/js/gadient/style.css"><link rel="stylesheet" href="https://www.novelupdates.com/wp-content/themes/ndupdates-child/js/chkstyle.css?ver=1.0.0"><link rel="stylesheet" href="https://www.novelupdates.com/wp-content/themes/ndupdates-child/js/seriestagging.css?ver=1.1.0"><link rel="stylesheet" href="https://www.novelupdates.com/wp-content/themes/ndupdates-child/js/chosen.min.css"><input type="hidden" id="mypostid" value="2072"><script type=\'text/javascript\' src=\'//www.novelupdates.com/wp-content/themes/ndupdates-child/js/jquery.popupoverlay.js\'></script><link rel="stylesheet" href="https://www.novelupdates.com/wp-content/themes/ndupdates-child/js/gh-buttons.css?ver=1.0.1">',
            ]);

            const client = new NovelUpdatesClient(undefined);
            const id = await client.getIdFromUrl("https://www.novelupdates.com/series/martial-world/");

            expect(id).toBe(2072);
        });
    });

    describe("loadSeriesChapters", () => {
        it("Returns the list of all chapters for a given novel", async () => {
            setUpAjax([
                '<div class="sp_chp_title" title="close">Chapter Listing <span class="my_popupreading_close" style="float:right; font-weight:bold; cursor: pointer; font-size: 15px; margin-top: -10px; color: #c9c9c9;">X</span></div><ol class="sp_chp"><li class="sp_li_chp odd"><a title="Go to chapter page" href="//www.novelupdates.com/nu_goto_chapter.php?sid=2072&rid=55539"><i class="fa fa-reply fa-rotate-180 fa-flip-horizontal fn" aria-hidden="true"></i></a><a href="//www.novelupdates.com/extnu/55539/" data-id="55539"><span title="c0">c0</span>\
                </a>\
                </li><li class="sp_li_chp odd"><a title="Go to chapter page" href="//www.novelupdates.com/nu_goto_chapter.php?sid=2072&rid=64956"><i class="fa fa-reply fa-rotate-180 fa-flip-horizontal fn" aria-hidden="true"></i></a><a href="//www.novelupdates.com/extnu/64956/" data-id="64956"><span title="prologue">prologue</span>\
                </a>\
                </li></ol>0',
            ]);

            const client = new NovelUpdatesClient(undefined);
            const chapters = await client.loadSeriesChapters(2072);

            expect(chapters.length).toBe(2);
            expect(chapters[0].id).toBe(64956);
            expect(chapters[0].name).toBe("prologue");
            expect(chapters[0].html).toBe("prologue");
            expect(chapters[0].url).toBe(undefined);
            expect(chapters[1].id).toBe(55539);
            expect(chapters[1].name).toBe("c0");
            expect(chapters[1].html).toBe("c0");
            expect(chapters[1].url).toBe(undefined);
        });
    });

    describe("getNextChaptersByUrl", () => {
        it("Returns the list of the next few chapters listed at the given url", async () => {
            setUpAjax([
                '<span style="position: absolute; top: 17px; right: -15px;"><span class="updateread getchp" style="float: right; position: relative; top: -13px; width: 24px; height: 24px;" title="I\'ve read the latest chapter!" onclick="latestchp(\'2310235\',\'2072\',this,\'yes\',\'2016-02-29&nrid=1328137\')"><img border="0" src="https://www.novelupdates.com/siteicons/updateicon.png" width="24" height="24"></span></span><ul class="rounded-list"><li><a class="getchps" id="mycurrent1328136" href="http://www.wuxiaworld.com/novel/martial-world/mw-chapter-1360" onmousedown="latestchp(\'1328136\',\'2072\',this,\'no\',\'2016-03-15&nrid=1328136\')">c1360</a></li><li><a class="getchps" id="mycurrent1127420" href="http://www.wuxiaworld.com/novel/martial-world/mw-chapter-1359" onmousedown="latestchp(\'1127420\',\'2072\',this,\'no\',\'2016-03-10&nrid=1127420\')">c1359</a></li><li><a class="getchps" id="mycurrent1124005" href="http://www.wuxiaworld.com/novel/martial-world/mw-chapter-1358" onmousedown="latestchp(\'1124005\',\'2072\',this,\'no\',\'2016-03-05&nrid=1124005\')">c1358</a></li><li><a class="getchps" id="mycurrent1328137" href="http://www.wuxiaworld.com/novel/martial-world/mw-chapter-1357" onmousedown="latestchp(\'1328137\',\'2072\',this,\'no\',\'2016-02-29&nrid=1328137\')">c1357</a></li></ul>',
            ]);

            const client = new NovelUpdatesClient(undefined);
            const chapters = await (client as any).getNextChaptersByUrl("https://www.novelupdates.com/readinglist_getchp.php?rid=2310235&sid=2072&date=2016-02-29&nrid=1328137", 1328137);

            expect(chapters.length).toBe(3);
            expect(chapters[0].id).toBe(1124005);
            expect(chapters[0].name).toBe("c1358");
            expect(chapters[0].html).toBe("c1358");
            expect(chapters[0].url).toBe("http://www.wuxiaworld.com/novel/martial-world/mw-chapter-1358");
            expect(chapters[1].id).toBe(1127420);
            expect(chapters[1].name).toBe("c1359");
            expect(chapters[1].html).toBe("c1359");
            expect(chapters[1].url).toBe("http://www.wuxiaworld.com/novel/martial-world/mw-chapter-1359");
            expect(chapters[2].id).toBe(1328136);
            expect(chapters[2].name).toBe("c1360");
            expect(chapters[2].html).toBe("c1360");
            expect(chapters[2].url).toBe("http://www.wuxiaworld.com/novel/martial-world/mw-chapter-1360");
        });
    });

    describe("getReadingLists", () => {
        it("Returns undefined if the user is not logged in", async () => {
            setLoginStatus(false);
            const client = new NovelUpdatesClient(undefined);
            const lists = await client.getReadingLists();
            expect(lists).toBe(undefined);
        });

        it("Returns the list of the logged in user's reading lists", async () => {
            setUpAjax([
                '<form name="update_lists" action="/sort-reading-list/" method="post"><table id="myTable read_rl_sort" class="tablesorter"> \
                    <thead>\
                        <tr>\
                            <th class="header"></th>\
                            <th class="header">Name</th>\
                            <th class="header">Description</th>\
                            <th class="header">Icon</th>\
                        </tr>\
                    </thead>\
                    <tbody><tr class="unsortable">\
                        <td align="center"><span id="rl_checkbox_disbled"><i class="fa fa-bars rlsort" aria-hidden="true"></i></span></td>\
                        <td>Reading (Disabled)</td>\
                            <td>Default Reading List</td>\
                            <td><img style="max-height: 24px; max-width: 24px; border-radius:0px;" src="//www.novelupdates.com/wp-content/themes/ndupdates-child/js/selectico/default_rl.png"></td>\
                        </tr><tr pid="1">\
                        <td align="center"><span id="rl_checkbox" value="0"><i class="fa fa-bars rlsort" aria-hidden="true"></i></span></td>\
                        <td>Pelle</td>\
                            <td>Juste une pelle</td>\
                        <td><img style="max-height: 24px; max-width: 24px; border-radius:0px;" src="//www.novelupdates.com/wp-content/themes/ndupdates-child/js/selectico/1.png"></td>\
                        </tr><tr pid="2">\
                        <td align="center"><span id="rl_checkbox" value="0"><i class="fa fa-bars rlsort" aria-hidden="true"></i></span></td>\
                        <td>Apple</td>\
                            <td></td>\
                        <td><img style="max-height: 24px; max-width: 24px; border-radius:0px;" src="//www.novelupdates.com/wp-content/themes/ndupdates-child/js/selectico/2.png"></td>\
                    </tr></tbody>\
                </table>\
                <div><span class="nu_button rlsort" onclick="getsortids_rl(this);"><i class="fa fa-wrench" aria-hidden="true"></i> Update Sort</span></div>',
            ]);

            setLoginStatus(true);
            const client = new NovelUpdatesClient(undefined);
            const lists = await client.getReadingLists();

            expect(lists.length).toBe(3);
            expect(lists[0].id).toBe(0);
            expect(lists[0].name).toBe("Reading");
            expect(lists[0].description).toBe("Default Reading List");
            expect(lists[0].iconUrl).toBe("https://www.novelupdates.com/wp-content/themes/ndupdates-child/js/selectico/default_rl.png");
            expect(lists[1].id).toBe(1);
            expect(lists[1].name).toBe("Pelle");
            expect(lists[1].description).toBe("Juste une pelle");
            expect(lists[1].iconUrl).toBe("https://www.novelupdates.com/wp-content/themes/ndupdates-child/js/selectico/1.png");
            expect(lists[2].id).toBe(2);
            expect(lists[2].name).toBe("Apple");
            expect(lists[2].description).toBe("");
            expect(lists[2].iconUrl).toBe("https://www.novelupdates.com/wp-content/themes/ndupdates-child/js/selectico/2.png");
        });
    });

    describe("getReadingListNovels", () => {
        it("Returns undefined if the user is not logged in", async () => {
            setLoginStatus(false);
            const client = new NovelUpdatesClient(undefined);
            const lists = await client.getReadingListNovels(0);
            expect(lists).toBe(undefined);
        });

        it("Returns the list of the novels", async () => {
            setUpAjax([
                '<style>.webui-popover.top { margin-left: -25px; }</style> <table id="myTable read" class="tablesorter">\
                    <thead>\
                        <tr>\
                        <th class="header read"></th>\
                        <th class="header read">Series (<span class="rl_sid_count">2</span>)</th>\
                        <th class="header read">My Status</th><th class="header read">Latest Release</th></tr>\
                    </thead>\
                    <tbody><tr class="rl_links" data-sid="2072" data-title="Martial World" data-tags=",martial,world," data-notes="yes" data-rate="" data-genreid=",8,13,5,3,14,3954,"><td width="5%"><span class="hidden">0 Martial World</span><input type="checkbox" name="check" class="checkme2072 not-empty" id="chkst2072" value="1328137:2072"><label onclick="" for="chkst2072" class="selchk" title="delete"></label></td><td width="50%" class="title_shorten"><a title="Martial World" href="https://www.novelupdates.com/series/martial-world/">Martial World</a></td><td width="20%"><input type="hidden" id="series2072" value="2310235"><a class="chp-release" id="mystatus2310235" href="http://www.wuxiaworld.com/novel/martial-world/mw-chapter-1357" rel="nofollow">c1357</a></td><td width="25%"><a class="chp-release latest" id="mylatest2310235" href="https://www.wuxiaworld.com/novel/martial-world/mw-chapter-2132" rel="nofollow">c2132</a>\
                        <div class="bmhide 2310235"><span class="bm_hide_me2310235"><span id="bmicon" title="Show me chapters I haven\'t read!" class="show-pop btn btn-default bottom 2072" data-placement="top" data-url="https://www.novelupdates.com/readinglist_getchp.php?rid=2310235&sid=2072&date=2016-02-29&nrid=1328137" data-content="" data-target="webuiPopover3" data-title="Loading Chapters..." data-cache="false"><img border="0" src="//www.novelupdates.com/wp-content/themes/ndupdates-child/js/icons/book4.png"></span></span><span class="nu_editnotes my_popupnotes_open" title="Edit notes" onclick="getnotes_rl(\'Martial World\',\'2072\');"><i class="fa fa-sticky-note rlnotes sid2072" aria-hidden="true"></i></span></div>\
                        </td></tr><tr class="rl_links" data-sid="907" data-title="Peerless Martial God" data-tags=",peerless,martial,good," data-notes="yes" data-rate="" data-genreid=",8,9,5,3,14,4,3954,"><td width="5%"><span class="hidden">0 Peerless Martial God</span><input type="checkbox" name="check" class="checkme907 not-empty" id="chkst907" value="1550642:907"><label onclick="" for="chkst907" class="selchk" title="delete"></label></td><td width="50%" class="title_shorten"><a title="Peerless Martial God" href="https://www.novelupdates.com/series/peerless-martial-god/">Peerless Martial God</a></td><td width="20%"><input type="hidden" id="series907" value="2076690"><a class="chp-release" id="mystatus2076690" href="https://totallytranslations.com/pmg-chapter-1480/" rel="nofollow">c1480</a></td><td width="25%"><a class="chp-release latest" id="mylatest2076690" href="https://totallytranslations.com/pmg-chapter-2500-the-end/" rel="nofollow">c2500 (end)</a>\
                        <div class="bmhide 2076690"><span class="bm_hide_me2076690"><span id="bmicon" title="Show me chapters I haven\'t read!" class="show-pop btn btn-default bottom 907" data-placement="top" data-url="https://www.novelupdates.com/readinglist_getchp.php?rid=2076690&sid=907&date=2007-02-14&nrid=1550642" data-content="" data-target="webuiPopover3" data-title="Loading Chapters..." data-cache="false"><img border="0" src="//www.novelupdates.com/wp-content/themes/ndupdates-child/js/icons/book4.png"></span></span><span class="nu_editnotes my_popupnotes_open" title="Edit notes" onclick="getnotes_rl(\'Peerless Martial God\',\'907\');"><i class="fa fa-sticky-note rlnotes sid907" aria-hidden="true"></i></span></div>\
                        </td></tr></tbody>\
                    </table><div class="rlnotes_filter_msg">No results found. Please adjust your filters and try agian.</div>',
                '<div class="sp_chp_title" title="close">Chapter Listing <span class="my_popupreading_close" style="float:right; font-weight:bold; cursor: pointer; font-size: 15px; margin-top: -10px; color: #c9c9c9;">X</span></div><ol class="sp_chp"><li class="sp_li_chp odd"><a title="Go to chapter page" href="//www.novelupdates.com/nu_goto_chapter.php?sid=2072&rid=55539"><i class="fa fa-reply fa-rotate-180 fa-flip-horizontal fn" aria-hidden="true"></i></a><a href="//www.novelupdates.com/extnu/55539/" data-id="55539"><span title="c0">c0</span>\
                    </a>\
                    </li><li class="sp_li_chp odd"><a title="Go to chapter page" href="//www.novelupdates.com/nu_goto_chapter.php?sid=2072&rid=64956"><i class="fa fa-reply fa-rotate-180 fa-flip-horizontal fn" aria-hidden="true"></i></a><a href="//www.novelupdates.com/extnu/64956/" data-id="64956"><span title="prologue">prologue</span>\
                    </a>\
                    </li></ol>0',
                '<span style="position: absolute; top: 17px; right: -15px;"><span class="updateread getchp" style="float: right; position: relative; top: -13px; width: 24px; height: 24px;" title="I\'ve read the latest chapter!" onclick="latestchp(\'2310235\',\'2072\',this,\'yes\',\'2016-02-29&nrid=1328137\')"><img border="0" src="https://www.novelupdates.com/siteicons/updateicon.png" width="24" height="24"></span></span><ul class="rounded-list"><li><a class="getchps" id="mycurrent1328136" href="http://www.wuxiaworld.com/novel/martial-world/mw-chapter-1360" onmousedown="latestchp(\'1328136\',\'2072\',this,\'no\',\'2016-03-15&nrid=1328136\')">c1360</a></li><li><a class="getchps" id="mycurrent1127420" href="http://www.wuxiaworld.com/novel/martial-world/mw-chapter-1359" onmousedown="latestchp(\'1127420\',\'2072\',this,\'no\',\'2016-03-10&nrid=1127420\')">c1359</a></li><li><a class="getchps" id="mycurrent1124005" href="http://www.wuxiaworld.com/novel/martial-world/mw-chapter-1358" onmousedown="latestchp(\'1124005\',\'2072\',this,\'no\',\'2016-03-05&nrid=1124005\')">c1358</a></li><li><a class="getchps" id="mycurrent1328137" href="http://www.wuxiaworld.com/novel/martial-world/mw-chapter-1357" onmousedown="latestchp(\'1328137\',\'2072\',this,\'no\',\'2016-02-29&nrid=1328137\')">c1357</a></li></ul>',
                "",
                "",
            ]);

            setLoginStatus(true);

            const storage = {
                getCache(): any { return undefined; },
                setCache() { /* No op */ },
            };

            const client = new NovelUpdatesClient(storage as any);
            const novels = await client.getReadingListNovels(0);

            expect(novels.length).toBe(2);
            expect(novels[0].id).toBe(2072);
            expect(novels[0].name).toBe("Martial World");
            expect(novels[0].url).toBe("https://www.novelupdates.com/series/martial-world/");
            expect(novels[0].notes.hasNotes).toBe(true);
            expect(novels[0].notes.tags).toEqual(["martial", "world"]);
            expect(novels[0].notes.notes).toBe(undefined);
            expect(novels[0].status.id).toBe(1328137);
            expect(novels[0].status.name).toBe("c1357");
            expect(novels[0].status.html).toBe("c1357");
            expect(novels[0].status.url).toBe("http://www.wuxiaworld.com/novel/martial-world/mw-chapter-1357");
            expect(novels[0].next.map((c) => c.id)).toEqual([64956, 55539]); // ?
            expect(novels[0].latest.id).toBe(2310235);
            expect(novels[0].latest.name).toBe("c2132");
            expect(novels[0].latest.html).toBe("c2132");
            expect(novels[0].latest.url).toBe("https://www.wuxiaworld.com/novel/martial-world/mw-chapter-2132");
        });
    });
});
