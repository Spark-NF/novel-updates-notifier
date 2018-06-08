const loaderDiv = document.getElementById("loader");
const loaderText = loaderDiv.getElementsByTagName("span")[0];
const errorDiv = document.getElementById("error");
const errorText = loaderDiv.getElementsByTagName("span")[0];
const readerDiv = document.getElementById("reader");
const readerIframe = document.getElementById("iframe") as HTMLIFrameElement;
const chapterName = document.getElementById("chapter-name") as HTMLHeadingElement;
const chapterContent = document.getElementById("chapter-content") as HTMLDivElement;

async function loadChapter(url: string): Promise<void> {
    loaderDiv.classList.remove("hidden");
    errorDiv.classList.add("hidden");

    // Show chapter contents
    const useReader = false;
    if (useReader) {
        chapterContent.innerHTML = url;
        readerDiv.classList.remove("hidden");
    } else {
        readerIframe.src = url;
        readerIframe.classList.remove("hidden");
    }

    loaderDiv.classList.add("hidden");
}
