var page = require('webpage').create();
const fs = require('fs');

page.open('https://www.madlan.co.il/local/נתיבות?source=source_search', function(status) {
  console.log("Status: " + status);
  if(status === "success") {
    page.render('example.png');
  }
  phantom.exit();
});


// let town = "נתיבות";
// let url = 'https://www.madlan.co.il/local/' + town + '?source=source_search';

// page.open(url, function(status) {
//   var htmlRes = page.evaluate(function() {
//     return document.innerHTML;
//   });

//   await fs.writeFile(town + ".html", htmlRes);
//   phantom.exit();
// });