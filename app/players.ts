import { currentRankingFor } from "./current-rankings";

export type Position = "QB" | "RB" | "WR" | "TE" | "DST" | "K";

export type Player = {
  id: string;
  name: string;
  team: string;
  pos: Position;
  bye: number;
  rank: number;
  tier: number;
};

type PlayerSeed = [string, string, Position, number, number];

const offense: PlayerSeed[] = [
  ["Jahmyr Gibbs","DET","RB",6,1],["Bijan Robinson","ATL","RB",11,1],["Ja'Marr Chase","CIN","WR",6,1],["Puka Nacua","LAR","WR",11,1],["Jaxon Smith-Njigba","SEA","WR",11,1],["Amon-Ra St. Brown","DET","WR",6,1],["Christian McCaffrey","SF","RB",8,1],["Jonathan Taylor","IND","RB",13,1],["CeeDee Lamb","DAL","WR",14,1],
  ["James Cook III","BUF","RB",7,2],["Justin Jefferson","MIN","WR",6,2],["Ashton Jeanty","LV","RB",13,2],["Drake London","ATL","WR",11,2],["Chase Brown","CIN","RB",6,2],["A.J. Brown","NE","WR",11,2],["Saquon Barkley","PHI","RB",10,2],["Brock Bowers","LV","TE",13,2],["De'Von Achane","MIA","RB",6,2],["Omarion Hampton","LAC","RB",7,2],["Nico Collins","HOU","WR",8,2],["Derrick Henry","BAL","RB",13,2],["George Pickens","DAL","WR",14,2],["Kenneth Walker III","KC","RB",5,2],
  ["Trey McBride","ARI","TE",14,3],["Chris Olave","NO","WR",8,3],["Rashee Rice","KC","WR",5,3],["Josh Allen","BUF","QB",7,3],["Malik Nabers","NYG","WR",8,3],["DeVonta Smith","PHI","WR",10,3],["Zay Flowers","BAL","WR",13,3],["Kyren Williams","LAR","RB",11,3],["Tetairoa McMillan","CAR","WR",5,3],["Tee Higgins","CIN","WR",6,3],["Jeremiyah Love","ARI","RB",14,3],["Breece Hall","NYJ","RB",13,3],["Javonte Williams","DAL","RB",14,3],["Lamar Jackson","BAL","QB",13,3],["Ladd McConkey","LAC","WR",7,3],["Emeka Egbuka","TB","WR",10,3],["Josh Jacobs","GB","RB",11,3],["Jaylen Waddle","DEN","WR",10,3],["Garrett Wilson","NYJ","WR",13,3],
  ["Colston Loveland","CHI","TE",10,4],["Drake Maye","NE","QB",11,4],["Terry McLaurin","WAS","WR",7,4],["Travis Etienne Jr.","NO","RB",8,4],["Cam Skattebo","NYG","RB",8,4],["Joe Burrow","CIN","QB",6,4],["Davante Adams","LAR","WR",11,4],["Luther Burden III","CHI","WR",10,4],["Tyler Warren","IND","TE",13,4],["D'Andre Swift","CHI","RB",10,4],["Jameson Williams","DET","WR",6,4],["Quinshon Judkins","CLE","RB",11,4],["Bucky Irving","TB","RB",10,4],["Mike Evans","SF","WR",8,4],["David Montgomery","HOU","RB",8,4],["Christian Watson","GB","WR",11,4],["DJ Moore","BUF","WR",7,4],["Rome Odunze","CHI","WR",10,4],["Jayden Daniels","WAS","QB",7,4],["Jalen Hurts","PHI","QB",10,4],["Bhayshul Tuten","JAC","RB",7,4],["TreVeyon Henderson","NE","RB",11,4],
  ["Jadarian Price","SEA","RB",11,5],["Caleb Williams","CHI","QB",10,5],["Tucker Kraft","GB","TE",11,5],["Parker Washington","JAC","WR",7,5],["Carnell Tate","TEN","WR",9,5],["Justin Herbert","LAC","QB",7,5],["Marvin Harrison Jr.","ARI","WR",14,5],["Jaylen Warren","PIT","RB",9,5],["Rhamondre Stevenson","NE","RB",11,5],["Brian Thomas Jr.","JAC","WR",7,5],["Trevor Lawrence","JAC","QB",7,5],["Sam LaPorta","DET","TE",6,5],["Tony Pollard","TEN","RB",9,5],["Harold Fannin Jr.","CLE","TE",11,5],["DK Metcalf","PIT","WR",9,5],["Dak Prescott","DAL","QB",14,5],["Rico Dowdle","PIT","RB",9,5],["Kyle Pitts Sr.","ATL","TE",11,5],["Chris Godwin Jr.","TB","WR",10,5],["Courtland Sutton","DEN","WR",10,5],["Chuba Hubbard","CAR","RB",5,5],["Alec Pierce","IND","WR",13,5],["Jonathon Brooks","CAR","RB",5,5],["J.K. Dobbins","DEN","RB",10,5],
  ["Michael Pittman Jr.","PIT","WR",9,6],["Michael Wilson","ARI","WR",14,6],["Josh Downs","IND","WR",13,6],["Quentin Johnston","LAC","WR",7,6],["Brock Purdy","SF","QB",8,6],["Jordyn Tyson","NO","WR",8,6],["Jaxson Dart","NYG","QB",8,6],["Blake Corum","LAR","RB",11,6],["RJ Harvey","DEN","RB",10,6],["George Kittle","SF","TE",8,6],["Bo Nix","DEN","QB",10,6],["Kyle Monangai","CHI","RB",10,6],["Patrick Mahomes II","KC","QB",5,6],["Wan'Dale Robinson","TEN","WR",9,6],["Jordan Addison","MIN","WR",6,6],["Travis Kelce","KC","TE",5,6],["Kenny Gainwell","TB","RB",10,6],["Jacory Croskey-Merritt","WAS","RB",7,6],["Makai Lemon","PHI","WR",10,6],["Jared Goff","DET","QB",6,6],["Matthew Stafford","LAR","QB",11,6],["Rachaad White","WAS","RB",7,6],["Jordan Mason","MIN","RB",6,6],["Jayden Reed","GB","WR",11,6],["Jakobi Meyers","JAC","WR",7,6],["Dalton Kincaid","BUF","TE",7,6],["Kyler Murray","MIN","QB",6,6],["Aaron Jones Sr.","MIN","RB",6,6],["Stefon Diggs","WAS","WR",7,6],["Isaiah Likely","NYG","TE",8,6],["Dallas Goedert","PHI","TE",10,6],["Jake Ferguson","DAL","TE",14,6],["Baker Mayfield","TB","QB",10,6],["Jordan Love","GB","QB",11,6],["Mark Andrews","BAL","TE",13,6],["Jayden Higgins","HOU","WR",8,6],["Tyler Shough","NO","QB",8,6],["Xavier Worthy","KC","WR",5,6],["Chris Rodriguez Jr.","JAC","RB",7,6],["Tyrone Tracy Jr.","NYG","RB",8,6],["KC Concepcion","CLE","WR",11,6],["Jalen Coker","CAR","WR",5,6],["Khalil Shakir","BUF","WR",7,6],["Matthew Golden","GB","WR",11,6],["Tyler Allgeier","ARI","RB",14,6],
  ["Woody Marks","HOU","RB",8,7],["Malik Willis","MIA","QB",6,7],["Romeo Doubs","NE","WR",11,7],["Zach Charbonnet","SEA","RB",11,7],["Juwan Johnson","NO","TE",8,7],["Tyjae Spears","TEN","RB",9,7],["Deebo Samuel Sr.","SF","WR",8,7],["Alvin Kamara","NO","RB",8,7],["Sam Darnold","SEA","QB",11,7],["De'Zhaun Stribling","SF","WR",8,7],["C.J. Stroud","HOU","QB",8,7],["Keaton Mitchell","LAC","RB",7,7],["Tank Bigsby","PHI","RB",10,7],["Brenton Strange","JAC","TE",7,7],["Rashid Shaheed","SEA","WR",11,7],["Chig Okonkwo","WAS","TE",7,7],["Hunter Henry","NE","TE",11,7],["Isiah Pacheco","DET","RB",6,7],["Brian Robinson Jr.","ATL","RB",11,7],["Jonah Coleman","DEN","RB",10,7],["Dylan Sampson","CLE","RB",11,7],["Cam Ward","TEN","QB",9,7],["Denzel Boston","CLE","WR",11,7],["Daniel Jones","IND","QB",13,7],["Oronde Gadsden II","LAC","TE",7,7],["Dalton Schultz","HOU","TE",8,7],["Jalen McMillan","TB","WR",10,7],
  ["MarShawn Lloyd","GB","RB",11,7],["Adonai Mitchell","NYJ","WR",13,7],["Tre Tucker","LV","WR",13,7],
];

const defenses: Array<PlayerSeed & { rank?: number }> = [
  Object.assign(["Houston Texans","HOU","DST",8,8] as PlayerSeed,{rank:194}),Object.assign(["Denver Broncos","DEN","DST",10,8] as PlayerSeed,{rank:195}),Object.assign(["Los Angeles Rams","LAR","DST",11,8] as PlayerSeed,{rank:198}),Object.assign(["Seattle Seahawks","SEA","DST",11,8] as PlayerSeed,{rank:199}),Object.assign(["Jacksonville Jaguars","JAC","DST",7,8] as PlayerSeed,{rank:202}),Object.assign(["Philadelphia Eagles","PHI","DST",10,8] as PlayerSeed,{rank:204}),Object.assign(["Minnesota Vikings","MIN","DST",6,8] as PlayerSeed,{rank:206}),Object.assign(["New England Patriots","NE","DST",11,8] as PlayerSeed,{rank:207}),Object.assign(["Pittsburgh Steelers","PIT","DST",9,8] as PlayerSeed,{rank:209}),Object.assign(["Los Angeles Chargers","LAC","DST",7,8] as PlayerSeed,{rank:210}),Object.assign(["Baltimore Ravens","BAL","DST",13,8] as PlayerSeed,{rank:216}),Object.assign(["Kansas City Chiefs","KC","DST",5,8] as PlayerSeed,{rank:217}),
];

const kickers: Array<PlayerSeed & { rank?: number }> = [
  Object.assign(["Ka'imi Fairbairn","HOU","K",8,8] as PlayerSeed,{rank:218}),Object.assign(["Brandon Aubrey","DAL","K",14,8] as PlayerSeed,{rank:219}),Object.assign(["Cameron Dicker","LAC","K",7,8] as PlayerSeed,{rank:220}),Object.assign(["Cam Little","JAC","K",7,9] as PlayerSeed,{rank:227}),Object.assign(["Jason Myers","SEA","K",11,9] as PlayerSeed,{rank:228}),Object.assign(["Eddy Pineiro","SF","K",8,9] as PlayerSeed,{rank:229}),Object.assign(["Tyler Loop","BAL","K",13,9] as PlayerSeed,{rank:230}),Object.assign(["Jake Bates","DET","K",6,9] as PlayerSeed,{rank:235}),Object.assign(["Cairo Santos","CHI","K",10,9] as PlayerSeed,{rank:242}),Object.assign(["Harrison Mevis","LAR","K",11,9] as PlayerSeed,{rank:245}),Object.assign(["Chase McLaughlin","TB","K",10,9] as PlayerSeed,{rank:249}),Object.assign(["Evan McPherson","CIN","K",6,9] as PlayerSeed,{rank:255}),
];

export const players: Player[] = [
  ...offense.map(([name,team,pos,bye,tier], index) => {
    const current = currentRankingFor(name, index + 1, tier, team, bye);
    return { id:`p-${index + 1}`, name, team:current.team ?? team, pos, bye:current.bye ?? bye, tier:current.tier, rank:current.rank };
  }),
  ...defenses.map((seed, index) => ({ id:`dst-${index + 1}`, name:seed[0], team:seed[1], pos:seed[2], bye:seed[3], tier:seed[4], rank:seed.rank ?? 194 + index })),
  ...kickers.map((seed, index) => ({ id:`k-${index + 1}`, name:seed[0], team:seed[1], pos:seed[2], bye:seed[3], tier:seed[4], rank:seed.rank ?? 218 + index })),
];
