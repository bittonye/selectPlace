const scrapeIt = require("scrape-it");

scrapeIt("http://localhost:8080/netivot.html", {
    "שם הישוב": ".mdln-main-title",
    "מחיר למטר רבוע": {
        selector: "#main-price-index:first-child > li.item:first-child > span:first-child",
        convert: x => {
            x = x.replace(/\n/g, '');
            x = x.replace(/\t/g, '');
            x = x.replace(/₪/g, '');
            x = x.replace(/,/g, '');
            x = x.trim();
            return parseInt(x, 10);
        }
    },
    "מדד בתי הספר בעיר": {
        selector: "#mdlnEducationInsights > div.schoolComBoxCont > div.schoolComBox:first-child > div.schoolComGrade:not(span)",
        convert: x => {
            return parseInt(x, 10);
        }
    },
    "מדד בתי הספר בארץ": {
        selector: "#mdlnEducationInsights > div.schoolComBoxCont > div.schoolComBox:last-child > div.schoolComGrade:not(span)",
        convert: x => {
            return parseInt(x, 10);
        }
    },
    // "test": "#opinionsAdvantagesTitle + ul > li",
    "יתרונות": {
        listItem: "#opinionsAdvantagesTitle + ul > li"
    },
    "חסרונות": {
        listItem: "#opinionsDisadvantagesTitle + ul > li"
    },
    "אחוזי הצבעה": {
        listItem: "#demographicTabPlots > div",
        convert: x => {
            return x;
        }
    }
}).then(page => {
    console.log(page)
})