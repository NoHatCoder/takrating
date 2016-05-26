## takrating
Code used for calculating ratings based on games played on playtak.com.

Install [Node.js](https://nodejs.org/).

In a console, navigate to the directory where you want to install takrating, and run the command `npm install https://github.com/nohatcoder/takrating/tarball/master` in order to download takrating and sqlite3.

Download a game database from [Playtak](https://www.playtak.com/games), and place it in the same folder.

Run `node takrating.js` in order to generate the ranking list, and some statistics shown in the console.

Look at and/or modify the source code and settings in `takrating.js`.

Tested on Windows, should work on most platforms.