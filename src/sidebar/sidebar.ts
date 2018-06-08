const loaderDiv = document.getElementById("loader");
const loaderText = loaderDiv.getElementsByTagName("span")[0];
const chapterName = document.getElementById("chapter-name") as HTMLHeadingElement;
const chapterContent = document.getElementById("chapter-content") as HTMLDivElement;

async function loadChapter(url: string): Promise<void> {
    chapterContent.innerHTML = url;

    loaderDiv.classList.add("hidden");
}
