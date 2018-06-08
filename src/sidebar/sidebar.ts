const loaderDiv = document.getElementById("loader");
const loaderText = loaderDiv.getElementsByTagName("span")[0];
const errorDiv = document.getElementById("error");
const errorText = loaderDiv.getElementsByTagName("span")[0];
const readerDiv = document.getElementById("reader");
const chapterName = document.getElementById("chapter-name") as HTMLHeadingElement;
const chapterContent = document.getElementById("chapter-content") as HTMLDivElement;

async function loadChapter(url: string): Promise<void> {
    loaderDiv.classList.remove("hidden");
    errorDiv.classList.add("hidden");

    // Show chapter contents
    chapterContent.innerHTML = url;

    readerDiv.classList.remove("hidden");
    loaderDiv.classList.add("hidden");
}
