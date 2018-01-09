const puppeteer = require('puppeteer');
const fs = require('fs');
const cheerio = require('cheerio');
const _ = require('lodash');
const async = require('async');

const votes= require('./voting/votes.json');
const mikves= require('./mikve/mikves.json');
const bneiAkiva = require('./places/bneiAkiva.json');
const ariel = require('./places/ariel.json');
const rabbies = require('./places/rabbies.json');
const towns = require('./places/townsRes.json');

/* Global exceptions handler */
process.on('uncaughtException', (err) => {
  console.log('whoops! there was an error');
  console.log(err);
});

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
    "ממד יסודי": "אין"
  };
  let bestSchool = 0;
  let hasSchool = $(".bodyTableCont tbody tr").each(function() {
    let type = $(":nth-child(4)", this).text().trim();
    let ages = $(":nth-child(3)", this).text().trim();
    if ((type.indexOf(religious) > -1) && (ages.indexOf(elementry) > -1)) {
      let rate = 0;
      try {
        rate = $(":nth-child(1) ", this).text().trim().substring(0,2);
      } catch (ex) {
        rate = 0;
      }
      rate = parseInt(rate, 10);
      if (rate > bestSchool) {
        let name = $(":nth-child(2)", this).text().trim();
        res["ממד יסודי"] = name;
        res["דירוג בית ספר"] = rate;
      }
    }
  });

  return res;
};

const getProsCons = ($) => {
  let pros = [];
  let cons = [];
  $("#opinionsAdvantagesTitle + ul > li").each(function() {
    pros.push($(this).text());
  });

  $("#opinionsDisadvantagesTitle + ul > li").each(function() {
    cons.push($(this).text());
  });

  return {
    "יתרונות": pros,
    "חסרונות": cons
  };
};

const getPricePerMeter = ($) => {
  let price = $("#main-price-index:first-child > li.item:first-child > span:first-child").text();
  price = price.replace(/\n/g, '');
  price = price.replace(/\t/g, '');
  price = price.replace(/₪/g, '');
  price = price.replace(/,/g, '');
  price = price.trim();
  return {
    "מחיר למ\"ר": parseInt(price, 10)
  };
};

var scrapTownHTML = async (town) => {
  let res = {};
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 1000 // slow down by 500ms
  });
  try {
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(true);
    await page.goto('https://www.madlan.co.il/local/' + town + '?source=source_search',
                    {waitUntil: 'networkidle2'});

    await page.waitFor(4000);
    let htmlRes = await page.evaluate(() => {
      let retVal = '';
      if (document.doctype)
        retVal = new XMLSerializer().serializeToString(document.doctype);
      if (document.documentElement)
        retVal += document.documentElement.outerHTML;
      return retVal;
    });
    
    let $ = cheerio.load(htmlRes); // Load HTML Data
    res = getSchoolsData($);
    res = {
      ...res,
      ...getPricePerMeter($),
      ...getProsCons($)
    };

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
  } catch(ex) {
    console.log(town + " Failed");
    console.log(ex);
    await browser.close();
  }
  return res;
};

let precentagesFrom = (wing, total) => _.round((wing*100)/total);
let getLeftiesPrecentage = (lefties, data, total) => {
  var res = 0;
  _.each(lefties, (left) => {
    res += precentagesFrom(data[left], total);
  })
  return res;
}

const getVotingData = (town) => {
  let name = " שם ישוב";
  let voted = "מצביעים";
  let jewishHouse = "טב";
  let yahad = "קץ";
  let licud = "מחל";
  let shas = "שס";
  let jewishTorah = "ג";
  let lefties = ["מרצ", "אמת", "ודעם"];

  var data = _.find(votes, function(v) { return (town.indexOf(v[name]) > -1);});
  if (!data) {
    return {};
  }
  let total = parseInt(data[voted], 10);
  let res = {
      "ליכוד": precentagesFrom(data[licud], total),
      "הבית היהודי": precentagesFrom(data[jewishHouse], total),
      "יחד": precentagesFrom(data[yahad], total),
      "שס": precentagesFrom(data[shas], total),
      "יהדות התורה": precentagesFrom(data[jewishTorah], total),
      "מפלגות שמאל": getLeftiesPrecentage(lefties, data, total),
  }
  return res;
}

const hashMiqve = (town) => {
  try {
    var has = _.find(mikves, function(m) { return (m.indexOf(town) > -1);});
    if (has.length > 0) {
      return {
        'יש מקווה': "יש"
      };
    } else {
      return {
        'יש מקווה': "אין"
      };
    }
  } catch(ex) {
    return {
      'יש מקווה': "אין"
    };
  }
}

const getRabbiesData = (town) => {
  var has = _.find(rabbies, function(r) { return (town.indexOf(r.town) > -1);});
  if (!has) {
    return {
    };
  }
  let raby = has;
  return {
    'שם הרב': raby.name,
    'פלאפון': raby.phone,
    'טלפון': raby.homePhone
  };
}

const getTnuot = (town) => {
  var has = _.find(bneiAkiva, function(t) { return (town.indexOf(t) > -1);});
  let res = {};
  if (!has) {
    res = {
      'בני עקיבא': "אין"
    };
  }
  else if (has.length > 0) {
    res = {
      'בני עקיבא': "יש"
    };
  }

  has = _.find(ariel, function(t) { return (town.indexOf(t) > -1);});
  if (!has) {
    res['אריאל'] = "אין"
  } else {
    res['אריאל'] = "יש"
  }

  return res;
}

var getTownData = async (town) => {
  let res = {};
  let htmlData = await scrapTownHTML(town);
  let votingData = getVotingData(town);
  let mikveData = hashMiqve(town);
  let tnuotData = getTnuot(town);
  let rabbiesData = getRabbiesData(town);
  res = {
    ...htmlData,
    ...votingData,
    ...mikveData,
    ...tnuotData,
    ...rabbiesData
  };
  return res;
};

let checkTowns = ["טול כרם", "רמלה", 'אשקלון', 'תל אביב', 'פתח תקווה', 'השרון'];


const chunks = (chunksArray, chunkSize) => {
  let array = _.filter(chunksArray, (town) => {
    return _.find(checkTowns, function(t) { return (town.around.indexOf(t) > -1);});
  });
  return [].concat.apply([],
      array.map(function(elem,i) {
          return i%chunkSize ? [] : [array.slice(i,i+chunkSize)];
      })
  );
}

let totalRes = [];
async.eachSeries(chunks(towns, 10), (chunk, callback) => {
    async.each(chunk, (town, cb) => {
      getTownData(town.name.trim()).then((res) => {
        res =  {
          ...res,
          "שם ישוב": town.name,
          "לווין": town.around,
          "ילדים עד גיל 6": town.kidsSix,
          "ילדים בין 7 ל18": town.kidsEighteen,
          "אנשים בין 18 ל45": town.adultsFourtyFive,
          "אנשים מעל 45": town.adultsFourtySix,
          "סך הכל תושבים": town.totalPeople
        };
        totalRes.push(res);
        cb();
      });
    }, (err) => {
      callback();
    })
  }, (err) => {
  if (!err) {
    fs.writeFileSync("choosenTowns.json", JSON.stringify(totalRes));
  }
});
