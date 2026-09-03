export type PlayerProfile = {
  age: number;
  yearsExp: number;
  injuryStatus?: string;
  recurringRisk?: number;
};

export const PLAYER_PROFILES_REFRESHED = "September 3, 2026";

// Age, experience, and current availability are based on the Sleeper player feed.
// recurringRisk is a small, manually reviewed penalty for repeated recent absences.
const sleeperProfiles: Record<string, [number, number, string?]> = {
  "Jahmyr Gibbs": [24,3], "Bijan Robinson": [24,3], "Ja'Marr Chase": [26,5,"Questionable"],
  "Puka Nacua": [25,3,"Questionable"], "Jaxon Smith-Njigba": [24,3], "Amon-Ra St. Brown": [26,5],
  "Christian McCaffrey": [30,9,"Questionable"], "Jonathan Taylor": [27,6], "CeeDee Lamb": [27,6],
  "James Cook III": [26,4], "Justin Jefferson": [27,6], "Ashton Jeanty": [22,1,"Questionable"],
  "Drake London": [25,4], "Chase Brown": [26,3], "A.J. Brown": [29,7], "Saquon Barkley": [29,8],
  "Brock Bowers": [23,2], "De'Von Achane": [24,3], "Omarion Hampton": [23,1], "Nico Collins": [27,5],
  "Derrick Henry": [32,10], "George Pickens": [25,4], "Kenneth Walker III": [25,4,"Questionable"],
  "Trey McBride": [26,4], "Chris Olave": [26,4], "Rashee Rice": [26,3], "Josh Allen": [30,8],
  "Malik Nabers": [23,2,"Questionable"], "DeVonta Smith": [27,5], "Zay Flowers": [25,3,"Questionable"],
  "Kyren Williams": [25,4], "Tetairoa McMillan": [23,1], "Tee Higgins": [27,6,"Questionable"],
  "Jeremiyah Love": [21,0,"Questionable"], "Breece Hall": [25,4,"Questionable"], "Javonte Williams": [26,5],
  "Lamar Jackson": [29,8], "Ladd McConkey": [24,2], "Emeka Egbuka": [23,1,"Questionable"],
  "Josh Jacobs": [28,7], "Jaylen Waddle": [27,5], "Garrett Wilson": [26,4],
  "Colston Loveland": [22,1], "Drake Maye": [23,2], "Terry McLaurin": [30,7],
  "Travis Etienne Jr.": [27,5], "Cam Skattebo": [24,1], "Joe Burrow": [29,6], "Davante Adams": [33,12],
  "Luther Burden III": [22,1,"Questionable"], "Tyler Warren": [24,1,"Questionable"], "D'Andre Swift": [27,6],
  "Jameson Williams": [25,4], "Quinshon Judkins": [22,1], "Bucky Irving": [23,2],
  "Mike Evans": [32,12,"Questionable"], "David Montgomery": [29,7], "Christian Watson": [27,4],
  "DJ Moore": [29,8], "Rome Odunze": [24,2], "Jayden Daniels": [25,2], "Jalen Hurts": [28,6],
  "Bhayshul Tuten": [23,1,"Questionable"], "TreVeyon Henderson": [23,1,"Questionable"], "Jadarian Price": [22,0],
  "Caleb Williams": [24,2], "Tucker Kraft": [25,3,"Questionable"], "Parker Washington": [24,3],
  "Carnell Tate": [21,0,"Questionable"], "Justin Herbert": [28,6], "Marvin Harrison Jr.": [24,2],
  "Jaylen Warren": [27,4], "Rhamondre Stevenson": [28,5], "Brian Thomas Jr.": [23,2,"Questionable"],
  "Trevor Lawrence": [26,5], "Sam LaPorta": [25,3,"Questionable"], "Tony Pollard": [29,7],
  "Harold Fannin Jr.": [22,1], "DK Metcalf": [28,7,"Questionable"], "Dak Prescott": [33,10],
  "Rico Dowdle": [28,6], "Kyle Pitts Sr.": [25,5], "Chris Godwin Jr.": [30,9], "Courtland Sutton": [30,8],
  "Chuba Hubbard": [27,5,"Questionable"], "Alec Pierce": [26,4], "Jonathon Brooks": [23,2,"Questionable"],
  "J.K. Dobbins": [27,6], "Michael Pittman Jr.": [28,6,"Questionable"], "Michael Wilson": [26,3],
  "Josh Downs": [25,3,"Questionable"], "Quentin Johnston": [24,3], "Brock Purdy": [26,4],
  "Jordyn Tyson": [22,0,"IR"], "Jaxson Dart": [23,1], "Blake Corum": [25,2], "RJ Harvey": [25,1],
  "George Kittle": [32,9,"Questionable"], "Bo Nix": [26,2], "Kyle Monangai": [24,1,"Questionable"],
  "Patrick Mahomes II": [30,9,"Questionable"], "Wan'Dale Robinson": [25,4,"Questionable"],
  "Jordan Addison": [24,3], "Travis Kelce": [36,13], "Kenny Gainwell": [27,5],
  "Jacory Croskey-Merritt": [25,1,"Questionable"], "Makai Lemon": [22,0], "Jared Goff": [31,10],
  "Matthew Stafford": [38,17], "Rachaad White": [27,4,"Questionable"], "Jordan Mason": [27,4],
  "Jayden Reed": [26,3], "Jakobi Meyers": [29,7,"Questionable"], "Dalton Kincaid": [26,3],
  "Kyler Murray": [29,7], "Aaron Jones Sr.": [31,9], "Stefon Diggs": [32,11], "Isaiah Likely": [26,4],
  "Dallas Goedert": [31,8], "Jake Ferguson": [27,4], "Baker Mayfield": [31,8], "Jordan Love": [27,6],
  "Mark Andrews": [30,8], "Jayden Higgins": [23,1,"IR"], "Tyler Shough": [26,1], "Xavier Worthy": [23,2],
  "Chris Rodriguez Jr.": [26,3], "Tyrone Tracy Jr.": [26,2,"Questionable"], "KC Concepcion": [21,0],
  "Jalen Coker": [24,2], "Khalil Shakir": [26,4,"Questionable"], "Matthew Golden": [23,1],
  "Tyler Allgeier": [26,4], "Woody Marks": [25,1], "Malik Willis": [27,4], "Romeo Doubs": [26,4],
  "Zach Charbonnet": [25,3,"PUP"], "Juwan Johnson": [29,6], "Tyjae Spears": [25,3],
  "Deebo Samuel Sr.": [30,7], "Alvin Kamara": [31,9,"Questionable"], "Sam Darnold": [29,8],
  "De'Zhaun Stribling": [23,0,"Questionable"], "C.J. Stroud": [24,3], "Keaton Mitchell": [24,3,"Questionable"],
  "Tank Bigsby": [23,3], "Brenton Strange": [25,3], "Rashid Shaheed": [27,4], "Chig Okonkwo": [26,4],
  "Hunter Henry": [31,10], "Isiah Pacheco": [27,4,"IR"], "Brian Robinson Jr.": [27,4],
  "Jonah Coleman": [22,0], "Dylan Sampson": [21,1], "Cam Ward": [24,1], "Denzel Boston": [22,0],
  "Daniel Jones": [29,7], "Oronde Gadsden II": [23,1], "Dalton Schultz": [30,8],
  "Jalen McMillan": [24,2,"Questionable"], "MarShawn Lloyd": [25,3], "Adonai Mitchell": [24,2],
  "Tre Tucker": [25,4], "Ka'imi Fairbairn": [32,10], "Brandon Aubrey": [31,3],
  "Cameron Dicker": [26,4,"Questionable"], "Cam Little": [23,2], "Jason Myers": [35,11], "Eddy Pineiro": [30,8],
  "Tyler Loop": [25,1], "Jake Bates": [27,3], "Cairo Santos": [34,12], "Harrison Mevis": [24,2],
  "Chase McLaughlin": [30,7], "Evan McPherson": [27,5],
};

const recurringAvailabilityRisk: Record<string, number> = {
  "Christian McCaffrey": 4, "J.K. Dobbins": 4, "Jonathon Brooks": 4,
  "Christian Watson": 3, "George Kittle": 3, "Malik Nabers": 3, "Jordyn Tyson": 3,
  "Keaton Mitchell": 3, "Puka Nacua": 2, "Javonte Williams": 2, "Tucker Kraft": 2,
  "Alec Pierce": 2, "Rashid Shaheed": 2, "Deebo Samuel Sr.": 2,
  "Aaron Jones Sr.": 2, "Alvin Kamara": 2,
};

export function profileFor(name: string): PlayerProfile {
  const [age = 0, yearsExp = 0, injuryStatus] = sleeperProfiles[name] ?? [];
  return { age, yearsExp, injuryStatus, recurringRisk: recurringAvailabilityRisk[name] ?? 0 };
}
