//The game id of the last game of the last update:
var lastgameid=57018

//Rating calculation parameters:
var initialrating=1000
var bonusrating=550
var bonusfactor=60
var participationlimit=2
var participationcutoff=1500

//File names:
var databasepath="games_anon (8).db"
var resultfile="ratings.txt"

//Statistics parameters, does not affect rating calculation:
var goodlimit=1700
var whiteadvantage=130
var showratingprogression=false
var playerhistory="ShlktBot"

var sqlite3=require("sqlite3")
var fs=require("fs")
var db=new sqlite3.Database(databasepath, sqlite3.OPEN_READONLY, main)

function main(error){
	//db.all("SELECT name FROM sqlite_master WHERE type='table';",tables)
	db.all("SELECT * FROM games ORDER BY date ASC, id ASC;",datacb)
	function datacb(error,data){
		var players={}
		var playerlist=[]
		var a
		var name
		var player
		var games=0
		var firsttime=1e20
		var lasttime=0
		var lastid=0
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
			if(includeplayer(data[a].player_white) && includeplayer(data[a].player_black) && data[a].size>=5 && data[a].notation!="" && data[a].result!="0-0"){// && isbot(data[a].player_white)+isbot(data[a].player_black)!=3){
				if(data[a].date%86400000 < lasttime%86400000){
					for(player in players){
						players[player].participation*=.975
					}
				}
				var hiccup=false
				if(data[a].date-lasttime<1000 && data[a].player_white===data[a-1].player_white){
					hiccup=true
					//console.log("Hiccup2 "+data[a].result+" "+data[a].date)
				}
				if(a+1!==data.length && data[a+1].date-data[a].date<1000 && data[a+1].player_white===data[a].player_white){
					if(data[a+1].result.indexOf("0")!==data[a].result.indexOf("0")){
						hiccup=true
						//console.log("Hiccup1 "+data[a].result+" "+data[a].date)
					}
					else{
						//console.log("Nohiccup1 "+data[a].result+" "+data[a].date)
					}
				}
				firsttime=Math.min(firsttime,data[a].date)
				lasttime=Math.max(lasttime,data[a].date)
				lastid=data[a].id
				if(!hiccup){
					games++
					addplayer(data[a].player_white)
					addplayer(data[a].player_black)
					var result={"1-0":1,"R-0":1,"F-0":1,"1/2-1/2":0.5,"0-1":0,"0-R":0,"0-F":0}[data[a].result]
					var sw=strength(data[a].player_white)*Math.pow(10,0/400)
					var sb=strength(data[a].player_black)
					var expected=sw/(sw+sb)
					var fairness=expected*(1-expected)
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
					adjustplayer(data[a].player_white,result-expected,fairness)
					adjustplayer(data[a].player_black,expected-result,fairness)
					if(data[a].player_white===playerhistory){
						printcurrentscore(data[a].player_white,data[a].player_black)
					}
					if(data[a].player_black===playerhistory){
						printcurrentscore(data[a].player_black,data[a].player_white)
					}
				}
				if(data[a].id===lastgameid){
					updatedisplayrating()
					for(name in players){
						players[name].oldrating=players[name].displayrating
					}
				}
			}
		}
		for(name in players){
			playerlist.push(players[name])
		}
		updatedisplayrating()
		playerlist.sort(function(a,b){return b.displayrating-a.displayrating})
		var out=""
		var ratingsum=0
		var hiddensum=0
		for(a=0;a<playerlist.length;a++){
			ratingsum+=playerlist[a].rating
			hiddensum+=playerlist[a].hidden
			if(/bot/i.test(playerlist[a].name)){
				console.log("Bot: "+playerlist[a].name)
			}
			var listname=playerlist[a].name
			if({"TakticianBot":1,"alphatak_bot":1,"alphabot":1,"cutak_bot":1,"TakticianBotDev":1,"takkybot":1,"ShlktBot":1,"AlphaTakBot_5x5":1}[playerlist[a].name]){
				listname="*"+listname+"*"
			}
			out+=(a+1)+"\\. | "+listname+" | "+(playerlist[a].displayrating===playerlist[a].rating?"":"\\*")+Math.floor(playerlist[a].displayrating)+" | "+sign(Math.floor(playerlist[a].displayrating)-Math.floor(playerlist[a].oldrating))+" | "+playerlist[a].games+"\r\n"
		}
		fs.writeFileSync(resultfile,out)
		console.log("Games: "+games)
		console.log("Accounts: "+playerlist.length)
		console.log("Timespan:")
		console.log(new Date(firsttime))
		console.log(new Date(lasttime))
		console.log("Last game: "+lastid)
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
		console.log("")
		console.log("Average rating: "+ratingsum/playerlist.length)
		console.log("Average bonus left: "+hiddensum/playerlist.length)
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
		function adjustplayer(name,amount,fairness){
			var bonus=Math.max(0,amount*players["!"+name].hidden*bonusfactor/bonusrating)
			players["!"+name].hidden-=bonus
			var k=10+15*Math.pow(.5,players["!"+name].games/200)+15*Math.pow(.5,(players["!"+name].maxrating-1000)/300)
			players["!"+name].rating+=amount*k+bonus
			if(players["!"+name].games<200){
				ratingcount[players["!"+name].games]++
				ratingsum[players["!"+name].games]+=amount*k+bonus
			}
			players["!"+name].participation+=fairness
			players["!"+name].games++
			players["!"+name].maxrating=Math.max(players["!"+name].maxrating,players["!"+name].rating)
		}
		function addplayer(name){
			if(!players["!"+name]){
				players["!"+name]={rating:initialrating,hidden:bonusrating,oldrating:initialrating,name:name,games:0,maxrating:initialrating,participation:participationlimit,displayrating:initialrating}
			}
		}
		function includeplayer(name){
			return name!=="Anon" && name!=="FriendlyBot" && name!=="cutak_bot" && !/^Guest[0-9]+$/.test(name)
		}
		function isbot(name){
			return {"TakticianBot":1,"alphatak_bot":1,"alphabot":1,"cutak_bot":1,"TakticianBotDev":1,"takkybot":1,"ShlktBot":1,"AlphaTakBot_5x5":1,"johnlewis":2}[name]
		}
		function printcurrentscore(pl,opponent){
			console.log(players["!"+pl].rating+" "+opponent)
		}
		function updatedisplayrating(){
			for(player in players){
				players[player].displayrating=players[player].rating
				if(players[player].participation<participationlimit && players[player].rating>participationcutoff){
					players[player].displayrating=participationcutoff+(players[player].rating-participationcutoff)*players[player].participation/participationlimit
				}
			}
		}
	}
}

function sign(number){
	return (number>0?"+":"")+number
}