const puppeteer = require('puppeteer');
const fs = require('fs');
const cheerio = require('cheerio');


const getSchoolsData = ($) => {
  res = {};
  let grade = $("#mdlnEducationInsights > div.schoolComBoxCont > div.schoolComBox:first-child > div.schoolComGrade:not(span)").text();
  res['מדד בתי הספר בעיר'] = parseInt(grade, 10);

  grade = $("#mdlnEducationInsights > div.schoolComBoxCont > div.schoolComBox:last-child > div.schoolComGrade:not(span)").text();
  res['מדד בתי הספר בארץ'] = parseInt(grade, 10);

  return res;
};

const checkSchools = ($) => {
  let religious = "דתי";
  let elementry = "יסודי";
  let res = {
    "ממ'ד יסודי": "אין"
  };
  let hasSchool = $(".bodyTableCont tbody tr").each(function() {
    let type = $(":nth-child(4)", this).text().trim();
    let ages = $(":nth-child(3)", this).text().trim();
    if ((type.indexOf(religious) > -1) && (ages.indexOf(elementry) > -1)) {
      res["ממ'ד יסודי"] = "יש";
    }
  });

  return res;
};

var scrapTownHTML = async (town) => {
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 500 // slow down by 500ms
  });
  const page = await browser.newPage();
  await page.setJavaScriptEnabled(true);
  await page.goto('https://www.madlan.co.il/local/' + town + '?source=source_search',
                  {waitUntil: 'networkidle2'});

  let htmlRes = await page.evaluate(() => {
    return document.documentElement.innerHTML;
  });
  
  let $ = cheerio.load(htmlRes); // Load HTML Data
  let res = getSchoolsData($);

  await page.goto('https://www.madlan.co.il/education/' + town, {waitUntil: 'networkidle2'});
  
  htmlRes = await page.evaluate(() => {
    return document.documentElement.innerHTML;
  });
  
  $ = cheerio.load(htmlRes); // Load HTML Data
  res = {
    ...checkSchools($),
    ...res
  };

  await browser.close();
  return res;
};

const getTownData = async (town) => {
  let res = {};
  let htmlData = await scrapTownHTML(town);
  res = {
    ...htmlData,
    ...res
  }
  console.log(res);
};

getTownData('נתיבות');