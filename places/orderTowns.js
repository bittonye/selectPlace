let towns = require('./towns.json');
let fs = require('fs');

let res = [];
for (let i = 0 ; i < towns.length; i++) {
    let town = towns[i];
    res.push({
        name: town['שם_ישוב'],
        around: town['נפה'],
        kidsSix: town['גיל_0_6'],
        kidsEighteen: town['גיל_6_18'],
        adultsFourtyFive: town['גיל_19_45'],
        adultsFourtySix: town['גיל_46_55'] + town['גיל_56_64'] + town['גיל_65_פלוס'],
        totalPeople: town['סהכ']
    });
}
fs.writeFileSync('townsRes.json', JSON.stringify(res));