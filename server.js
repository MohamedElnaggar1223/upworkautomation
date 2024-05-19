require("dotenv").config()
const express = require("express")
const fs = require("fs")
const path = require("path")
const xml2js = require('xml2js');

const app = express()

const PORT = process.env.PORT || 3000

app.get("/", async (req, res) => {
    const rssResults = await fetch("https://www.upwork.com/ab/feed/topics/rss?securityToken=d918fbf86b06309a07ecd82bed9dea8695fe86a3dc4c3ffc3d047c45c0305102e6acbcc6c031a79bf8f52a4f0f86208a5610462417368ebe4f97b1406c230396&userUid=1543965074222759936&orgUid=1543965074222759937")
    const rssText = await rssResults.text()
    const existingRSS = fs.readFileSync(path.join(__dirname, "rss.xml"), 'utf8')
    let existingLinks
    let newLinks
    xml2js.parseString(existingRSS, (err, result) => {
        const findLinkTags = (obj) => {
            let links = [];
            for (const key in obj) {
                if (key === 'link') {
                links = links.concat(obj[key]);
                } else if (typeof obj[key] === 'object') {
                links = links.concat(findLinkTags(obj[key]));
                }
            }
            return links;
        };
        existingLinks = findLinkTags(result);
    })

    xml2js.parseString(rssText, (err, result) => {
        const findLinkTags = (obj) => {
            let links = [];
            for (const key in obj) {
                if (key === 'link') {
                links = links.concat(obj[key]);
                } else if (typeof obj[key] === 'object') {
                links = links.concat(findLinkTags(obj[key]));
                }
            }
            return links;
        };
        newLinks = findLinkTags(result);
    })
    if(!newLinks || !existingLinks) return res.send("RSS feed is up to date")
    //@ts-ignore
    if(existingLinks?.length === 0 || newLinks[2] !== existingLinks[2]) {
        fs.writeFileSync("rss.xml", rssText)
        await fetch(`https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_IR}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.FACEBOOK_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": "+201022991613",
                "type": "text",
                "text": {
                    "preview_url": false,
                    "body": `New job posted on Upwork: ${newLinks[2]}`
                }
            }),
        }).then((response) => response.json()).then((data) => console.log(data)).catch((error) => console.log(error))
        return res.send("RSS feed updated")
    }
    return res.send("RSS feed is up to date")
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})