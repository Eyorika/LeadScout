// content_script.js

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "SCRAPE_PAGE") {
        const data = scrapeProfile();
        sendResponse(data);
    }
});

function scrapeProfile() {
    // 1. Get URL and Title
    const url = window.location.href;
    const docTitle = document.title;

    // 2. Heuristics for Name
    // Try H1 first, as it's often the user's name on profile pages
    let name = "";
    const h1 = document.querySelector("h1");
    if (h1) {
        name = h1.innerText.trim();
    } else {
        // Fallback to title, splitting by common separators like " | " or " - "
        name = docTitle.split('|')[0].split('-')[0].trim();
    }

    // 3. Heuristics for Company/Role
    // This is harder to do generically. 
    // We look for meta description which often contains "Software Engineer at Google"
    const metaDesc = document.querySelector('meta[name="description"]')?.content || "";
    
    // Try to guess from meta description or title
    let role = "";
    let company = "";

    // Very basic parsing attempt: "Role at Company"
    if (metaDesc.includes(" at ")) {
        const parts = metaDesc.split(" at ");
        role = parts[0].trim(); // Risky guess
        company = parts[1]?.split(/[.,]/)[0].trim(); // Take first part after "at"
    }

    return {
        name: name,
        role: role,
        company: company,
        url: url
    };
}
