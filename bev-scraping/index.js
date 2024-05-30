const parse = require('node-html-parser');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const process = require('process');
const url = 'https://www.lcbo.com/en/products#t=clp-products&sort=relevancy&layout=card';
const fs = require('fs');
let requestCount = 0;

const categoriesStringENUM = {
    Spirit: "Spirits",
    BeerCider: "Beer & Cider",
    Wine: "Wine",
    Sake: "Sake",
    Cooler: "Coolers"
}

const categoriesENUM = {
    Spirit: 1,
    BeerCider: 2,
    Wine: 3,
    Sake: 4,
    Cooler: 5
}

const sqlDB = require('../backend/routes/database');
const db = new sqlDB().DB;
let sql;

const getBevs = async() => {
    let allBevs = [];

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: false
    });

    const page = await browser.newPage();

    page.on('response', async (response) =>{
        const request = response.request();
        requestCount++;
        
        
        if(request.url().includes('https://platform.cloud.coveo.com/rest/search/v2?organization')){
            console.log('Target found');
            console.log(request.url());
            try{
                const drinks = await response.json();
                const bevs = drinks.results;
                allBevs.push(bevs);
                
                //Whenever it finds a good request, it hits uses the loadMore function to load more pages
                const result = await page.evaluate(async () => {
                    //Checks if there are still any pages left to load in
                    if(document.getElementById('loadMore')){
                        loadMore();
                    }else{  //Stops if there are none left
                        await browser.close();
                    }
                    
                });
            }catch(error){
                console.error('Failed to parse json');
            }
            
        }else{
            //console.log(`Request count: ${requestCount}`);
        }
    });

    await page.goto(url);

    await new Promise(resolve => {
        const keepAlive = setInterval(() => {
            // This keeps the promise unresolved, hence keeping the browser open
            console.log('Keeping browser open...');
        }, 10000); // Logs every 10 seconds to keep the process alive

        // Handle manual closure
        browser.on('disconnected', () => {
            clearInterval(keepAlive);
            resolve();
        });
    });

    // Returning bevs after browser is closed manually
    return allBevs;
}

const insertBevsToDB = (bevs) =>{
    //Do insert query for each of the bevs
    bevs.forEach((bev) =>{
        sql = 'INSERT INTO Drinks (drink_name, total_volume, alcohol_percent, category_ID, pieces_per, price, image_url) VALUES (?,?,?,?,?,?,?)'

        db.run(sql, [bev.title, bev.volume, bev.percent, bev.category, bev.piecesPer, bev.price, bev.thumbnail], (err)=>{
            if(err){
                return console.error(err.message);
            }else{
                //Wrote successfully to the database
                //console.log('Wrote record to Drinks Table');
            }
        });
    });
}

const getCategory = (categories) =>{
    let length = categories.length;
    const categoryArr = categories[length - 1];  //Gets the last index of the categories array
    const typesArr = categoryArr.split("|");
    const category = typesArr[1];

    //Returns the category id for the 

    let categoryID;
    switch(category){
        case categoriesStringENUM.Spirit: categoryID = categoriesENUM.Spirit; break;
        case categoriesStringENUM.BeerCider: categoryID = categoriesENUM.BeerCider; break;
        case categoriesStringENUM.Wine: categoryID = categoriesENUM.Wine; break;
        case categoriesStringENUM.Sake: categoryID = categoriesENUM.Sake; break;
        case categoriesStringENUM.Cooler: categoryID = categoriesENUM.Cooler; break;
        default: categoryID = 0; break; //Returns 0 if there wasn't a valid drink detected
    }
    return categoryID;
}

const start = async () =>{
    let allBevs = [];
    const bevsArr = await getBevs();
    
    bevsArr.forEach((bevs) =>{
        bevs.forEach((bev)=>{
            try{
                let bevVolume = 0;
                if(bev.raw.lcbo_unit_volume && bev.raw.lcbo_total_volume){
                    const volumeSplit = lcbo_unit_volume.split("x");
                    if(volumeSplit.length > 1){
                        bevVolume = parseFloat(volumeSplit[1].trim());
                    }else{
                        bevVolume = parseFloat(volumeSplit[0]);
                    }
                }else if(bev.raw.lcbo_unit_volume){
                    const volumeSplit = lcbo_unit_volume.split("x");
                    if(volumeSplit.length > 1){
                        bevVolume = parseFloat(volumeSplit[1].trim());
                    }else{
                        bevVolume = parseFloat(volumeSplit[0]);
                    }
                }else{
                    bevVolume = parseFloat(bev.raw.lcbo_total_volume);
                }

                const bevObj = {
                    title: bev.Title,
                    url: bev.uri,
                    volume: bevVolume,
                    percent: parseFloat(bev.raw.lcbo_alcohol_percent),
                    price: parseFloat(bev.raw.ec_price),
                    category: getCategory(bev.raw.ec_category),
                    thumbnail: bev.raw.ec_thumbnails,
                    piecesPer: parseInt(bev.raw.lcbo_bottles_per_pack)
                }
                if (bevObj.volume > 0 && bevObj.percent > 0 && bevObj.category > 0){
                    allBevs.push(bevObj);
                }
            }catch(error){
                console.error(error);
            }
        });
    });

    console.log(`Drink count: ${allBevs.length}`);

    insertBevsToDB(allBevs);

    /*
    fs.writeFile('bevs.json', JSON.stringify(allBevs), err => {
        if (err) {
            console.error(err);
        } else {
            console.log('File finished!');
        }
    });*/
}



start();