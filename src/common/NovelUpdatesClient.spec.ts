// tslint:disable:max-line-length

import * as ajax from "./ajax";
import { NovelUpdatesClient } from "./NovelUpdatesClient";

jest.mock("./ajax");

describe("NovelUpdatesClient", () => {
    describe("search", () => {
        it("Returns the search results as structured objects", async () => {
            const resp = {
                responseText: '<ul><li class="search_li_results"><a class="a_search" href="https://www.novelupdates.com/series/martial-world/"><img class="search_profile_image" src="//cdn.novelupdates.com/img/series_2072.jpg"><span style="width: 80%;white-space: nowrap;overflow: hidden;text-overflow: ellipsis;display: inline-block;">\
                <span class="search_hl">Martial World</span>\
                </span></a></li><li class="search_li_results"><a class="a_search" href="https://www.novelupdates.com/series/true-martial-world/"><img class="search_profile_image" src="//cdn.novelupdates.com/img/series_4010.jpg"><span style="width: 80%;white-space: nowrap;overflow: hidden;text-overflow: ellipsis;display: inline-block;">\
                True <span class="search_hl">Martial World</span>\
                </span></a></li></ul>0',
            };
            (ajax as any).ajax.mockResolvedValue(resp);

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
});
