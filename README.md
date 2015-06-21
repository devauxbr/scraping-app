# scraping-app
A small express.js app to scrap contents from [infogreffe.fr](https://www.infogreffe.fr/societes/) and [societe.com](http://www.societe.com/) and rendeer it in a [handsontable]((http://handsontable.com/)) view and easily copy and paste it to your favorite spreadsheet software (Excel, Google Sheets, Open/LibreOffice Calc, ...)

### Requirements

- [Node.js](https://nodejs.org/)
- [Bower](http://bower.io/)

### Preview

You can try the app online at this address :
[http://scrap.bdevaux.com/](http://scrap.bdevaux.com/)

### How do I use it ?

Simply paste the URL of the company which you want to get information (both from _societe.com_ and _infogreffe.fr_) and click "**Scrap !**".

After processing all the available information will appear in a Handsontable view, allowing you to select the relevant information and copy it to any other program (likely to be Excel, Google Sheet or Open/LibreOffice Calc)

### How does it work ?

The interface (index.html) contains javascript code making AJAX call to the server side.

The server is an [express.js](http://expressjs.com/) app that retrieves the two URLs from the front-end client, and uses [request](https://www.npmjs.com/package/request), [jsdom](https://www.npmjs.com/package/jsdom) and [jQuery](https://jquery.com/) to load the pages and scrap the relevant content.

It then sends it back to the interface which displays it in a [Handsontable](http://handsontable.com/) view.

### Install locally

- Download and install Node.js

- Install Bower :
```sh
$ npm install -g bower
```

- Clone the repository :
```sh
$ git clone git@github.com:devauxbr/scraping-app.git
$ cd scraping-app
```

- Install Node.js and Bower dependencies :
```sh
$ npm install
$ bower install
```

- Run the local server :
```sh
$ node app.js
```

Open [http://localhost:3000](http://localhost:3000) in your brother.

If you want to keep the server running, install [forever](https://github.com/foreverjs/forever) :
```sh
$ npm install -g forever
```
Then instead of `node app.js`, run :
```sh
$ forever start app.js
```
