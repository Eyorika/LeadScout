// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "SCRAPE_PAGE") {
        const data = scrapePage();
        sendResponse(data);
    }
});

function scrapePage() {
    const url = window.location.href;

    if (url.includes("linkedin.com/in/")) {
        return scrapeLinkedIn(url);
    } else if (url.includes("twitter.com") || url.includes("x.com")) {
        return scrapeTwitter(url);
    } else {
        return scrapeGeneric(url);
    }
}

function scrapeLinkedIn(url) {
    // LinkedIn Selectors (Valid as of 2024 - classes may change, using stable heuristics where possible)

    // Name: Usually in a secure-break-word class in the top card
    const nameElem = document.querySelector('h1.text-heading-xlarge') ||
        document.querySelector('.pv-text-details__left-panel h1');
    const name = nameElem ? nameElem.innerText.trim() : "";

    // Role/Headline
    const roleElem = document.querySelector('.text-body-medium.break-words');
    const role = roleElem ? roleElem.innerText.trim() : "";

    // Company: Hard to get reliable text without iterating experience, 
    // so we often rely on the headline or current company aria-label
    // MVP: Let user fill it, or try to parse from headline
    let company = "";
    if (role.includes(" at ")) {
        company = role.split(" at ")[1].trim();
    }

    return {
        name: name,
        role: role,
        company: company,
        url: url
    };
}

function scrapeTwitter(url) {
    // X / Twitter Selectors

    // Name: logic checks for the span inside the user name div
    // data-testid="UserName" usually contains Name and Handle (@handle)
    const nameElem = document.querySelector('div[data-testid="UserName"] span span');
    const name = nameElem ? nameElem.innerText.trim() : document.title.split('(')[0].trim();

    // Bio / Description
    const bioElem = document.querySelector('div[data-testid="UserDescription"]');
    const role = bioElem ? bioElem.innerText.trim() : "";

    return {
        name: name,
        role: role, // Using bio as role/description
        company: "Twitter/X", // Placeholder
        url: url
    };
}

function scrapeGeneric(url) {
    // 1. Get Title
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
    const metaDesc = document.querySelector('meta[name="description"]')?.content || "";

    let role = "";
    let company = "";

    // Very basic parsing attempt: "Role at Company"
    if (metaDesc.includes(" at ")) {
        const parts = metaDesc.split(" at ");
        role = parts[0].trim();
        company = parts[1]?.split(/[.,]/)[0].trim();
    }

    return {
        name: name,
        role: role,
        company: company,
        url: url
    };
}
