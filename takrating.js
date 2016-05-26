//Rating calculation parameters:
var initialrating=1000
var adjustmentfactor=32
var bonusrating=500
var bonusfactor=2

//File names:
var databasepath="games_anon.db"
var resultfile="ratings.txt"

//Statistics parameters, does not affect rating calculation:
var goodlimit=1500
var whiteadvantage=110
var showratingprogression=false

var sqlite3=require("sqlite3")
var fs=require("fs")
var db=new sqlite3.Database(databasepath, sqlite3.OPEN_READONLY, main)

function main(error){
	//db.all("SELECT name FROM sqlite_master WHERE type='table';",tables)
	db.all("SELECT * FROM games ORDER BY date ASC;",datacb)
	function datacb(error,data){
		var players={}
		var playerlist=[]
		var a
		var name
		var games=0
		var firsttime=1e20
		var lasttime=0
		var flatcount=0
		var roadcount=0
		var drawcount=0
		var othercount=0
		var goodcount=0
		var whitecount=0
		var blackcount=0
		var whiteexpected=0
		var ratingsum=[]
		var ratingcount=[]
		for(a=0;a<200;a++){
			ratingsum[a]=0
			ratingcount[a]=0
		}
		for(a=0;a<data.length;a++){
			if(includeplayer(data[a].player_white) && includeplayer(data[a].player_black) && data[a].size>=5 && data[a].notation!="" && data[a].result!="0-0"){
				games++
				firsttime=Math.min(firsttime,data[a].date)
				lasttime=Math.max(lasttime,data[a].date)
				addplayer(data[a].player_white)
				addplayer(data[a].player_black)
				var result={"1-0":1,"R-0":1,"F-0":1,"1/2-1/2":0.5,"0-1":0,"0-R":0,"0-F":0}[data[a].result]
				var sw=strength(data[a].player_white)
				var sb=strength(data[a].player_black)
				var expected=sw/(sw+sb)
				if(sw>Math.pow(10,goodlimit/400) && sb>Math.pow(10,goodlimit/400)){
					flatcount+=(data[a].result=="F-0" || data[a].result=="0-F")
					roadcount+=(data[a].result=="R-0" || data[a].result=="0-R")
					drawcount+=(data[a].result=="1/2-1/2")
					othercount+=(data[a].result=="1-0" || data[a].result=="0-1")
					goodcount++
					whitecount+=(result==1)
					blackcount+=(result==0)
					whiteexpected+=sw*Math.pow(10,whiteadvantage/400)/(sw*Math.pow(10,whiteadvantage/400)+sb)
				}
				adjustplayer(data[a].player_white,result-expected)
				adjustplayer(data[a].player_black,expected-result)
				if(games===11843){
					for(name in players){
						players[name].oldrating=players[name].rating
					}
				}
			}
		}
		for(name in players){
			playerlist.push(players[name])
		}
		playerlist.sort(function(a,b){return b.rating-a.rating})
		var out=""
		for(a=0;a<playerlist.length;a++){
			out+=(a+1)+"\\. | "+playerlist[a].name+" | "+Math.floor(playerlist[a].rating)+" | "+sign(Math.floor(playerlist[a].rating-playerlist[a].oldrating))+" | "+playerlist[a].games+"\r\n"
		}
		fs.writeFileSync(resultfile,out)
		console.log("Games: "+games)
		console.log("Accounts: "+playerlist.length)
		console.log("Timespan:")
		console.log(new Date(firsttime))
		console.log(new Date(lasttime))
		console.log("")
		console.log("Good player game statistics:")
		console.log("Flat wins: "+flatcount/goodcount)
		console.log("Road wins: "+roadcount/goodcount)
		console.log("Drawn: "+drawcount/goodcount)
		console.log("Forfeited or interrupted: "+othercount/goodcount)
		console.log("White wins: "+whitecount/goodcount)
		console.log("Black wins: "+blackcount/goodcount)
		console.log("Expected wins for white, with a white advantage of "+whiteadvantage+" rating points: "+whiteexpected/goodcount)
		console.log("Based on "+goodcount+" games with both players rated above "+goodlimit+".")
		if(showratingprogression){
			console.log("")
			console.log("Average rating progression:")
			var virtrating=initialrating
			for(a=0;a<200;a++){
				virtrating+=ratingsum[a]/ratingcount[a]
				console.log((a+1)+": "+virtrating)
			}
		}
		function strength(name){
			return Math.pow(10,players["!"+name].rating/400)
		}
		function adjustplayer(name,amount){
			var bonus=Math.max(0,amount*players["!"+name].hidden*bonusfactor*adjustmentfactor/bonusrating)
			players["!"+name].hidden-=bonus
			players["!"+name].rating+=amount*adjustmentfactor+bonus
			if(players["!"+name].games<200){
				ratingcount[players["!"+name].games]++
				ratingsum[players["!"+name].games]+=amount*adjustmentfactor+bonus
			}
			players["!"+name].games++
		}
		function addplayer(name){
			if(!players["!"+name]){
				players["!"+name]={rating:initialrating,hidden:bonusrating,oldrating:initialrating,name:name,games:0}
			}
		}
		function includeplayer(name){
			return name!=="Anon" && name!=="FriendlyBot" && !/^Guest[0-9]+$/.test(name)
		}
	}
}

function sign(number){
	return (number>0?"+":"")+number
}