var express = require('express'),
    bodyParser = require('body-parser'),
    jsdom = require('jsdom'),
    request = require('request'),
    _ = require('lodash'),
    moment = require('moment'),
    iconv = require('iconv');

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true})); // for parsing application/x-www-form-urlencoded



request = request.defaults(requestProxy);


app.post('/scrap', function (req, res) {

    // Enable CORS :
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");


    console.log(req.body);
    var node = {};

    request({
        uri: req.body.societe,
        encoding: null,
    }, function (err, response, body) {
        console.log(node.name + ' : request reponse received');

        // Convert from iso to utf-8
        var ic = new iconv.Iconv('iso-8859-1', 'utf-8');
        var buf = ic.convert(body);
        var utf8String = buf.toString('utf-8');

        //Just a basic error check
        if (err && response.statusCode !== 200) {
            console.log('Request error.');
        }

        //Send the body param as the HTML code we will parse in jsdom
        //also tell jsdom to attach jQuery in the scripts and loaded from jQuery.com

        jsdom.env(
            utf8String, [__dirname + '/bower_components/jquery/dist/jquery.min.js'],
            function (err, window) {
                var items = {};
                //Use jQuery just as in a regular HTML page
                var $ = window.jQuery;

                /* Parse and store with following resulting structure (example of Virtual Sensitive) :
                 {
                 "Dénomination": "VirtualSensitive",
                 "Adresse": " VIRTUALSENSITIVE, RUE LES RIVES DE L OISE 60280 VENETTE ",
                 "SIREN": "753143569",
                 "SIRET (siege)": "75314356900014",
                 "N° de TVA Intracommunautaire": "Obtenir le numéro de TVA ",
                 "Activité (Code NAF ou APE)": "Ingénierie, études techniques (7112B)",
                 "Forme juridique": "société par actions simplifiée",
                 "Date immatriculation RCS": "03-08-2012 Voir les statuts constitutifs",
                 "Date de dernière mise à jour": "06-01-2015 Voir les statuts à jour",
                 "Tranche d'effectif": "1 à 2 salariés",
                 "Capital social": "200618,00 EURO",
                 "Chiffre d'affaires 2013": "86000,00 EU"
                 }*/
                $('#rensjur').each(function () {
                    $(this).find('tr').each(function (rowIndex, r) {
                        var cols = [];
                        $(this).find('td').each(function (colIndex, c) {
                            cols.push(c.textContent.replace(/(?:\r\n|\r|\n)/g, ""));
                        });
                        items[cols[0]] = cols[1];
                    });
                });
                console.log(items);

                // Store in node item values of interest :

                // Update name with the official one :
                node.denomination = items["Dénomination"];
                node.adresse = (items["Adresse"]) ? items["Adresse"]
                    .replace('                                    ', '')
                    .replace('                                    ', '') : null;
                var regexCP = /([0-9]{5})/;
                var matchCP = regexCP.exec(node.adresse);
                node['Code Postal'] = matchCP ? matchCP[1] : null;
                var regexVille = /[0-9]{5}(.*)/;
                var matchVille = regexVille.exec(node.adresse);
                node['Ville'] = matchVille ? matchVille[1] : null;

                node.siren = items["SIREN"];
                node.siret = items["SIRET (siege)"];
                node.activite = items["Activité (Code NAF ou APE)"];

                var dateCreation = items["Date immatriculation RCS"] || items["Date création entreprise"];
                node.dateCreation = moment(dateCreation.split(" ")[0], "DD-MM-YYYY").format("YYYY-MM-DD");
                var dateFin = (items.Statut) ? items.Statut.split(' ')[items.Statut.split(' ').length - 1] : undefined;
                node.dateFin = moment(dateFin).format("YYYY-MM-DD");
                node.lastUpdated = moment(items["Date de dernière mise à jour"].split(" ")[0], "DD-MM-YYYY").format("YYYY-MM-DD");
                node.trancheEmployes = (items["Tranche d'effectif"]) ? (parseInt(items["Tranche d'effectif"].split(" ")[0]) || 0) : 0;
                node.capitalSocial = (items["Capital social"]) ? items["Capital social"].split(" ")[0].split(",")[0] : '';
                //console.log(node.name + " : process request done");

                request({
                    uri: req.body.infogreffe,
                    encoding: null,
                }, function (err, response, body) {
                    if (err) {
                        console.log(response)
                        console.log(node);
                    }

                    //Send the body param as the HTML code we will parse in jsdom
                    //also tell jsdom to attach jQuery in the scripts and loaded from jQuery.com
                    var ic = new iconv.Iconv('utf-8', 'utf-8');
                    var buf = ic.convert(body);
                    body = buf.toString('utf-8');
                    //console.log(body);

                    jsdom.env(
                        body, [__dirname + '/bower_components/jquery/dist/jquery.min.js'],
                        function (err, window) {
                            //Use jQuery just as in a regular HTML page
                            var $ = window.jQuery;

                            // Capture le contenu entre des balise <h3> :
                            var regex = /<h3.*?>(.*)?<\/h3>(.*)/;
                            var flag = false;

                            // Retrieve "denomination" :
                            node.denomination = $('.fichePmIdentDeno').text();
                            console.log('denomination : ' + node.denomination);

                            $('#showHideContent').find('.identTitreValeur').each(function (id, row) {
                                var match = regex.exec($(row).html());
                                if (match !== null && ($(row).attr('style') == 'display:block' || $(row).attr('style') == undefined)) {
                                    var title = match[1];
                                    var content = row.textContent.replace(title, '').replace('Voir le plan', '');
                                    flag = true;
                                    node[title] = content;
                                    if (title == 'Siège social') {
                                        var regexCP = /([0-9]{5})/;
                                        var matchCP = regexCP.exec(content);
                                        node['Code Postal'] = matchCP[1];

                                        var regexVille = /[0-9]{5}(.*)/;
                                        var matchVille = regexVille.exec(content);
                                        node['Ville'] = matchVille[1];
                                    } else if (title == 'Inscription') {
                                        var regexInscr = /([0-9]{2}\/[0-9]{2}\/[0-9]{4})/;
                                        var matchInscr = regexInscr.exec(content);
                                        node['Date création'] = matchInscr[1];

                                        var regexRad = /([0-9]{2}\/[0-9]{2}\/[0-9]{4}).*?e\sle\s([0-9]{2}\/[0-9]{2}\/[0-9]{4})/;
                                        var matchRad = regexRad.exec(content);
                                        node['Date radiation'] = (matchRad) ? matchRad[2] : '';
                                    } else if (title == 'Activité (code NAF)') {
                                        var regexNaf = /([0-9]{3,4}[A-Z])/;
                                        var matchNaf = regexNaf.exec(content);
                                        node['Code NAF'] = matchNaf[1];
                                        node['Activité'] = content.replace(node['Code NAF'] + ' : ', '');
                                    } else if (title == 'Derniers chiffres clés') {
                                        var yearResults = [];
                                        var result;
                                        // extract each year results :
                                        var rePattern = /.*?((?:[0-9]{2}\/[0-9]{2}\/[0-9]{4})\s*(?:[0-9]{1,3}(?:\s[0-9]{3})*)\s€\s*(?:-?[0-9]{1,3}(?:\s[0-9]{3})*)\s€\s*(?:[0-9]*)\s)/
                                        while ((result = rePattern.exec(content)) !== null) {
                                            yearResults.push(result[1]);
                                            var Match = result[0];
                                            content = content.replace(Match, '');
                                        }
                                        // extract each categories for each years :
                                        var rePatternYear = /.*?([0-9]{2}\/[0-9]{2}\/[0-9]{4})\s*([0-9]{1,3}(?:\s[0-9]{3})*)\s€\s*(-?[0-9]{1,3}(?:\s[0-9]{3})*)\s€\s*([0-9]*)/
                                        yearResults.forEach(function (yearResult, id) {
                                            console.log('result found !')
                                            var results = rePatternYear.exec(yearResult);
                                            if (results) {
                                                if (id == 0) {
                                                    node['CA'] = results[2];
                                                    node['Résultat'] = results[3];
                                                    node['Effectif'] = results[4] ? results[4] : undefined;
                                                }
                                                if (true) {
                                                    var year = _.last(results[1].split('/'));
                                                    node['CA ' + year] = results[2];
                                                    node['Résultat ' + year] = results[3];
                                                    node['Effectif ' + year] = results[4] ? results[4] : undefined;
                                                }
                                            }
                                        });
                                    }
                                } else {

                                }
                            });

                            res.send(node);
                        }
                    );
                });

            }
        );
    });
});

var server = app.listen(3000, function () {

    var host = server.address().address
    var port = server.address().port

    console.log('Example app listening at http://%s:%s', host, port);

});
