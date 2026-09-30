@tool
class_name Data
extends RefCounted
## Static game data: poses, attacks, enemy move sets, enemy types, level layout.

const D := {"hy": 0.0, "tx": 0.1, "ty": 0.0, "hx": -0.05, "sFx": -0.7, "sFz": 0.35, "eFx": -0.9, "sBx": -0.6,
	"sBz": 0.45, "eBx": -1.0, "lFx": -0.3, "kFx": 0.35, "lBx": 0.25, "kBx": 0.3, "wx": 0.5,
	"tz": 0.0, "hr": 0.0, "hxo": 0.0, "hdy": 0.0, "wz": 0.0, "hyw": 0.0}

const ATYPES := ["light", "heavy", "aerial", "dash"]
const ALABEL := {"light": "LIGHT", "heavy": "HEAVY", "aerial": "AERIAL", "dash": "DASH", "step": "STEP", "roll": "ROLL"}
## evasions Genichiro studies when you lean on them
const DTYPES := ["step", "roll"]
const COUNTER := {"light": "riposte", "heavy": "sidestepCut", "aerial": "skyCut", "dash": "stopThrust"}

const SPAWNS := [["grunt", 0, 17], ["grunt", 3.5, 21], ["spear", -4, 33], ["ronin", 1, 49], ["grunt", 4, 61], ["spear", -3, 63]]
const BOSS_POS := Vector3(0, 0, 108)

const HINTS := [
	[-99.0, "Click / J strike  ·  right-click / K guard, tapped as the blade lands = DEFLECT  ·  Q lock on"],
	[11.0, "Fill the gold posture bar, then strike while the red mark shows: DEATHBLOW"],
	[27.0, "危 thrust: Shift toward it = MIKIRI  ·  危 sweep: Space to jump it"],
	[43.0, "Enemies switch stances mid-fight. The tag over their head names the current one."],
	[70.0, "Sculptor's idol ahead: rest there. E drinks from the gourd."],
	[84.0, "The lord learns. Repeat one attack and he adapts. Mix light, heavy (F), aerial and dash strikes."],
]
const PAD_HINTS := [
	[-99.0, "RB strike  ·  LB guard, tapped as the blade lands = DEFLECT  ·  R3 lock on"],
	[11.0, "Fill the gold posture bar, then RB while the red mark shows: DEATHBLOW"],
	[27.0, "危 thrust: B toward it = MIKIRI  ·  危 sweep: A to jump it"],
	[43.0, "Enemies switch stances mid-fight. The tag over their head names the current one."],
	[70.0, "Sculptor's idol ahead: rest there. Y drinks from the gourd."],
	[84.0, "The lord learns. Repeat one attack and he adapts. Mix RB, RT, air and sprint strikes."],
]


static func _pose(o: Dictionary) -> Dictionary:
	var d := D.duplicate()
	d.merge(o, true)
	return d


static func poses() -> Dictionary:
	var lunge := {"lFx": -0.75, "kFx": 0.65, "lBx": 0.5, "kBx": 0.25}
	var P := {}
	P["idle"] = _pose({})
	# the Wolf's ready stance: low hips, bent knees, torso forward and slightly bladed, blade angled up
	P["wolf"] = _pose({"hy": -0.1, "tx": 0.24, "ty": -0.12, "hx": -0.18, "sFx": -0.85, "sFz": 0.3, "eFx": -0.75,
		"sBx": -0.75, "sBz": 0.55, "eBx": -0.9, "lFx": -0.55, "kFx": 0.55, "lBx": 0.25, "kBx": 0.35, "wx": 0.55})
	P["guard"] = _pose({"tx": 0.05, "sFx": -1.4, "sFz": 0.5, "eFx": -0.7, "sBx": -1.3, "sBz": 0.6, "eBx": -0.8,
		"wx": 0.7, "lFx": -0.35, "kFx": 0.3, "lBx": 0.35, "kBx": 0.35})
	P["windup"] = _pose({"ty": -0.42, "hyw": -0.12, "tx": -0.14, "sFx": -2.9, "sFz": 0.3, "eFx": -0.5, "sBx": -2.8, "sBz": 0.4, "eBx": -0.6,
		"wx": 0.0, "lFx": -0.45, "kFx": 0.4, "lBx": 0.4, "kBx": 0.3})
	P["slash"] = _pose(lunge.merged({"ty": 0.4, "hyw": 0.14, "hdy": -0.2, "hy": -0.1, "tx": 0.38, "sFx": -0.9, "sFz": 0.3, "eFx": -0.2, "sBx": -0.8,
		"sBz": 0.45, "eBx": -0.3, "wx": 0.9}))
	P["lowwind"] = _pose({"hy": -0.06, "hyw": -0.15, "ty": -0.5, "sFx": 0.3, "sFz": 0.3, "eFx": -0.3, "sBx": 0.3, "sBz": 0.4, "eBx": -0.4,
		"wx": 2.4, "lFx": -0.45, "kFx": 0.4, "lBx": 0.4, "kBx": 0.3})
	P["rise"] = _pose(lunge.merged({"hyw": 0.12, "hdy": -0.15, "hy": -0.05, "tx": -0.12, "ty": 0.38, "sFx": -2.6, "sFz": 0.3, "eFx": -0.3,
		"sBx": -2.5, "sBz": 0.4, "eBx": -0.4, "wx": 0.6}))
	P["thrustwind"] = _pose({"tx": -0.1, "ty": -0.4, "sFx": -0.5, "sFz": 0.1, "eFx": -1.2, "sBx": -0.4, "sBz": 0.2,
		"eBx": -1.3, "wx": 1.8, "lFx": -0.5, "kFx": 0.5, "lBx": 0.5, "kBx": 0.35})
	P["thrust"] = _pose({"hyw": 0.1, "hy": -0.14, "tx": 0.32, "ty": 0.28, "sFx": -1.5, "sFz": 0.25, "eFx": -0.05, "sBx": -1.4,
		"sBz": 0.35, "eBx": -0.1, "wx": 1.25, "lFx": -0.9, "kFx": 0.8, "lBx": 0.6, "kBx": 0.2})
	P["sweepwind"] = _pose({"hyw": -0.25, "hy": -0.3, "tx": 0.2, "ty": -0.9, "sFx": -0.4, "sFz": -0.2, "eFx": -0.4, "sBx": -0.4,
		"sBz": 0.2, "eBx": -0.5, "wx": 1.0, "lFx": -1.0, "kFx": 1.3, "lBx": 0.2, "kBx": 1.0})
	P["sweep"] = _pose({"hyw": 0.25, "hy": -0.3, "tx": 0.35, "ty": 0.9, "sFx": -1.2, "sFz": 0.3, "eFx": -0.1, "sBx": -1.1,
		"sBz": 0.5, "eBx": -0.2, "wx": 1.55, "lFx": -1.0, "kFx": 1.3, "lBx": 0.2, "kBx": 1.0})
	P["hurt"] = _pose({"tx": -0.35, "hx": -0.3, "sFx": -0.4, "sFz": 0.2, "eFx": -0.6, "sBx": -0.3, "sBz": 0.3,
		"eBx": -0.6, "lFx": -0.2, "kFx": 0.2, "lBx": 0.3, "kBx": 0.3})
	P["broken"] = _pose({"hy": -0.42, "tx": 0.6, "hx": 0.3, "sFx": -0.2, "sFz": 0.1, "eFx": -0.2, "sBx": -0.1,
		"sBz": 0.1, "eBx": -0.2, "wx": 1.8, "lFx": -1.4, "kFx": 1.4, "lBx": 0.1, "kBx": 2.0})
	P["jump"] = _pose({"lFx": -1.0, "kFx": 1.6, "lBx": -0.3, "kBx": 1.5})
	P["dodge"] = _pose({"hy": -0.2, "tx": 0.45, "lFx": -0.8, "kFx": 1.0, "lBx": 0.5, "kBx": 0.6})
	P["deathblow"] = _pose({"hy": -0.25, "tx": 0.6, "sFx": -1.2, "eFx": -0.1, "sBx": -1.1, "eBx": -0.2, "wx": 1.9,
		"lFx": -0.9, "kFx": 0.9, "lBx": 0.6, "kBx": 0.3})
	P["mikiri"] = _pose({"tx": -0.1, "lFx": -1.3, "kFx": 1.0, "lBx": 0.2, "kBx": 0.3})
	P["drink"] = _pose({"sBx": -2.3, "sBz": 0.9, "eBx": -1.3})
	P["roll"] = _pose({"hy": -0.35, "tx": 1.0, "hx": 0.6, "sFx": -1.6, "sFz": 0.6, "eFx": -1.6, "sBx": -1.6,
		"sBz": 0.6, "eBx": -1.6, "lFx": -1.6, "kFx": 2.2, "lBx": -1.4, "kBx": 2.2, "wx": 1.6})
	P["sprint"] = _pose({"tx": 0.5, "sFx": 0.6, "sFz": 0.15, "eFx": -0.4, "sBx": 0.6, "sBz": 0.15, "eBx": -0.4, "wx": 2.1})
	# deflect reactions alternate sides so chained deflects read as separate blows
	P["parryA"] = _pose({"hy": -0.12, "tx": -0.04, "ty": -0.3, "hx": -0.1, "sFx": -1.75, "sFz": 0.75, "eFx": -0.45,
		"sBx": -1.55, "sBz": 0.8, "eBx": -0.55, "wx": 0.95, "wz": 0.25, "lFx": -0.4, "kFx": 0.55, "lBx": 0.4, "kBx": 0.5})
	P["parryB"] = _pose({"hy": -0.12, "tx": -0.02, "ty": 0.22, "hx": -0.1, "sFx": -1.6, "sFz": 0.2, "eFx": -0.7,
		"sBx": -1.45, "sBz": 0.35, "eBx": -0.75, "wx": 0.7, "wz": -0.25, "lFx": -0.4, "kFx": 0.55, "lBx": 0.4, "kBx": 0.5})
	# Level 2
	P["roar"] = _pose({"hy": -0.15, "tx": -0.3, "hx": -0.55, "sFx": -1.0, "sFz": 1.3, "eFx": -0.4, "sBx": -1.0, "sBz": 1.3,
		"eBx": -0.4, "lFx": -0.6, "kFx": 0.7, "lBx": 0.4, "kBx": 0.5, "wx": 1.6})
	P["seal"] = _pose({"tx": 0.05, "hx": 0.05, "sFx": -1.3, "sFz": 0.9, "eFx": -1.4, "sBx": -1.3, "sBz": 0.95, "eBx": -1.4,
		"wx": 2.5, "lFx": -0.3, "kFx": 0.3, "lBx": 0.3, "kBx": 0.3})
	P["fatigue"] = _pose({"hy": -0.25, "tx": 0.5, "hx": 0.35, "sFx": -0.2, "eFx": -0.3, "sBx": -0.1, "eBx": -0.3, "wx": 1.9,
		"lFx": -0.8, "kFx": 0.9, "lBx": 0.3, "kBx": 0.6})
	return P


## Player attacks. The boss counts each `type` separately and adapts to repeats.
static func player_attacks() -> Dictionary:
	return {
		"light": [
			{"w": "windup", "s": "slash", "wind": 0.12, "act": 0.1, "rec": 0.22, "lunge": 0.5, "dmg": 12.0, "post": 9.0, "type": "light"},
			{"w": "lowwind", "s": "rise", "wind": 0.11, "act": 0.1, "rec": 0.22, "lunge": 0.4, "dmg": 12.0, "post": 9.0, "type": "light"},
			{"w": "windup", "s": "slash", "wind": 0.15, "act": 0.11, "rec": 0.34, "lunge": 0.7, "dmg": 16.0, "post": 13.0, "type": "light"},
		],
		"heavy": {"w": "thrustwind", "s": "thrust", "wind": 0.34, "act": 0.12, "rec": 0.42, "lunge": 1.3, "dmg": 22.0, "post": 24.0, "type": "heavy", "reach": 1.25, "guard_break": 1.7},
		"aerial": {"w": "windup", "s": "slash", "wind": 0.1, "act": 0.14, "rec": 0.26, "lunge": 0.6, "dmg": 15.0, "post": 15.0, "type": "aerial"},
		"dash": {"w": "sprint", "s": "slash", "wind": 0.08, "act": 0.13, "rec": 0.32, "lunge": 2.4, "dmg": 14.0, "post": 13.0, "type": "dash", "reach": 1.1},
		# only while wearing the Hollow mask: the heavy attack throws a crescent wave of codes
		"getsuga": {"w": "windup", "s": "slash", "wind": 0.2, "act": 0.14, "rec": 0.4, "lunge": 0.6, "dmg": 30.0, "post": 45.0, "type": "getsuga", "pierce": true, "wave": true},
	}


static func S(w: String, s: String, wind: float, act: float, rec: float, dmg: float, post: float, lunge: float, o: Dictionary = {}) -> Dictionary:
	var d := {"w": w, "s": s, "wind": wind, "act": act, "rec": rec, "dmg": dmg, "post": post, "lunge": lunge,
		"peril": "", "spin": false, "leap": 0.0, "hits_air": false, "extra_reach": 0.0,
		"tele": "", "proj": 0, "smoke": false, "nohit": false, "special": ""}
	d.merge(o, true)
	return d


static func moves() -> Dictionary:
	return {
		"slash": {"strikes": [S("windup", "slash", 0.5, 0.12, 0.4, 14, 22, 0.5)]},
		"double": {"strikes": [S("windup", "slash", 0.45, 0.12, 0.1, 13, 20, 0.5), S("lowwind", "rise", 0.28, 0.12, 0.45, 12, 18, 0.4)]},
		"combo2": {"strikes": [S("windup", "slash", 0.36, 0.11, 0.08, 15, 20, 0.6), S("lowwind", "rise", 0.22, 0.11, 0.45, 14, 20, 0.45)]},
		"combo3": {"strikes": [S("windup", "slash", 0.34, 0.11, 0.08, 15, 20, 0.55), S("lowwind", "rise", 0.2, 0.11, 0.08, 14, 20, 0.4), S("windup", "slash", 0.26, 0.12, 0.5, 18, 24, 0.7)]},
		"dashSlash": {"range": 5.5, "strikes": [S("sprint", "slash", 0.45, 0.14, 0.45, 16, 22, 3.1)]},
		"flurry": {"strikes": [S("windup", "slash", 0.32, 0.09, 0.04, 9, 14, 0.4), S("lowwind", "rise", 0.14, 0.09, 0.04, 9, 14, 0.3), S("windup", "slash", 0.14, 0.09, 0.04, 9, 14, 0.3), S("lowwind", "rise", 0.16, 0.1, 0.5, 11, 16, 0.4)]},
		"poke": {"strikes": [S("thrustwind", "thrust", 0.42, 0.12, 0.4, 13, 20, 0.4)]},
		"perilThrust": {"range": 3.6, "strikes": [S("thrustwind", "thrust", 0.72, 0.14, 0.6, 30, 35, 1.4, {"peril": "thrust"})]},
		"chargeThrust": {"range": 7.0, "strikes": [S("thrustwind", "thrust", 0.85, 0.3, 0.6, 32, 36, 4.5, {"peril": "thrust"})]},
		"leapStab": {"range": 5.2, "strikes": [S("windup", "deathblow", 0.5, 0.36, 0.5, 20, 26, 3, {"leap": 7.0})]},
		"perilSweep": {"strikes": [S("sweepwind", "sweep", 0.72, 0.16, 0.6, 26, 30, 0.9, {"peril": "sweep"})]},
		"spinSweep": {"strikes": [S("sweepwind", "sweep", 0.7, 0.32, 0.55, 24, 28, 0.4, {"peril": "sweep", "spin": true})]},
		"bigOverhead": {"strikes": [S("windup", "slash", 0.85, 0.14, 0.6, 26, 40, 0.8)]},
		"whirl": {"strikes": [S("sweepwind", "sweep", 0.4, 0.22, 0.05, 12, 18, 0.6, {"spin": true}), S("sweepwind", "sweep", 0.14, 0.22, 0.05, 12, 18, 0.6, {"spin": true}), S("windup", "slash", 0.2, 0.12, 0.6, 16, 24, 0.6)]},
		# boss counters, one per player attack type it has fully read
		"riposte": {"strikes": [S("lowwind", "rise", 0.2, 0.12, 0.5, 17, 26, 0.8)]},
		"sidestepCut": {"strikes": [S("windup", "slash", 0.3, 0.12, 0.5, 20, 28, 1.3)]},
		"skyCut": {"strikes": [S("lowwind", "rise", 0.12, 0.18, 0.5, 26, 30, 0.5, {"hits_air": true, "extra_reach": 0.6})]},
		"stopThrust": {"strikes": [S("thrustwind", "thrust", 0.2, 0.14, 0.5, 22, 30, 1.6)]},
		# his answer to a dodge he has read: wait out your invulnerability, then lunge to where you land
		"readStep": {"strikes": [S("thrustwind", "thrust", 0.25, 0.16, 0.5, 20, 28, 1.8, {"extra_reach": 0.8})]},
		"readRoll": {"strikes": [S("thrustwind", "thrust", 0.4, 0.16, 0.5, 20, 28, 2.8, {"extra_reach": 1.0})]},
		# void ninjas. tele: where they reappear before striking (behind / side / away / through you)
		"blinkStrike": {"range": 9.0, "strikes": [S("windup", "slash", 0.45, 0.1, 0.4, 12, 18, 0.3, {"tele": "behind"})]},
		"blinkFlurry": {"range": 9.0, "strikes": [S("windup", "slash", 0.45, 0.09, 0.05, 9, 14, 0.3, {"tele": "side"}), S("lowwind", "rise", 0.14, 0.09, 0.05, 9, 14, 0.3), S("windup", "slash", 0.16, 0.1, 0.45, 11, 16, 0.4, {"tele": "behind"})]},
		"throw3": {"range": 14.0, "strikes": [S("thrustwind", "thrust", 0.45, 0.08, 0.45, 9, 10, 0.0, {"proj": 3, "nohit": true})]},
		"vanish": {"range": 99.0, "strikes": [S("guard", "dodge", 0.22, 0.05, 0.3, 0, 0, 0.0, {"tele": "away", "nohit": true})]},
		"smokeSplit": {"range": 12.0, "strikes": [S("guard", "guard", 0.35, 0.05, 0.3, 0, 0, 0.0, {"smoke": true, "nohit": true})]},
		# Mugen Ashina. The blink chain is trimmed to 2 or 3 blinks when he starts it.
		"blinkChain": {"range": 20.0, "fatigue": 1.6, "strikes": [S("seal", "seal", 0.6, 0.05, 0.02, 0, 0, 0.0, {"special": "blink_charge", "nohit": true}),
			S("windup", "slash", 0.14, 0.1, 0.06, 14, 22, 0.3, {"tele": "through"}), S("windup", "slash", 0.14, 0.1, 0.06, 14, 22, 0.3, {"tele": "through"}),
			S("windup", "slash", 0.14, 0.1, 0.5, 16, 24, 0.3, {"tele": "through"})]},
		"blue": {"range": 12.0, "strikes": [S("seal", "seal", 0.45, 0.9, 0.05, 0, 0, 0.0, {"special": "blue", "nohit": true}),
			S("windup", "slash", 0.12, 0.11, 0.08, 15, 22, 0.6), S("lowwind", "rise", 0.18, 0.11, 0.5, 15, 22, 0.4)]},
		"red": {"range": 20.0, "strikes": [S("thrustwind", "thrust", 0.75, 0.1, 0.6, 0, 0, 0.0, {"special": "red", "nohit": true, "peril": "red"})]},
		"purple": {"range": 30.0, "strikes": [S("seal", "seal", 1.35, 0.7, 0.8, 0, 0, 0.0, {"special": "purple", "nohit": true, "peril": "purple"})]},
	}


static func sets() -> Dictionary:
	return {
		"grunt": [
			{"name": "Drill", "moves": [["slash", 1.0], ["double", 0.6]], "guard": 0.3, "dist": 1.7, "strafe": 0.5, "cd_mul": 1.0, "low": false},
			{"name": "Pressure", "moves": [["combo3", 1.0], ["dashSlash", 0.7]], "guard": 0.1, "dist": 1.5, "strafe": 0.15, "cd_mul": 0.6, "low": false},
			{"name": "Desperate", "moves": [["flurry", 1.0], ["perilThrust", 0.8]], "guard": 0.0, "dist": 1.6, "strafe": 0.0, "cd_mul": 0.5, "low": true},
		],
		"spear": [
			{"name": "Keep Away", "moves": [["poke", 1.0], ["spinSweep", 0.5]], "guard": 0.2, "dist": 2.5, "strafe": 0.5, "cd_mul": 1.0, "low": false},
			{"name": "Charge", "moves": [["chargeThrust", 1.0], ["leapStab", 0.7]], "guard": 0.1, "dist": 4.6, "strafe": 0.25, "cd_mul": 0.8, "low": false},
		],
		"ronin": [
			{"name": "Heavy Hand", "moves": [["bigOverhead", 1.0], ["perilSweep", 0.6]], "guard": 0.35, "dist": 2.0, "strafe": 0.35, "cd_mul": 1.1, "low": false},
			{"name": "Whirlwind", "moves": [["whirl", 1.0], ["double", 0.5]], "guard": 0.15, "dist": 1.8, "strafe": 0.2, "cd_mul": 0.8, "low": false},
			{"name": "Last Stand", "moves": [["whirl", 1.0], ["perilSweep", 0.8], ["bigOverhead", 0.6]], "guard": 0.05, "dist": 1.8, "strafe": 0.0, "cd_mul": 0.55, "low": true},
		],
		"boss1": [
			{"name": "Tomoe Blade", "moves": [["combo3", 1.0], ["combo2", 0.8], ["perilSweep", 0.4]], "guard": 0.4, "dist": 1.9, "strafe": 0.5, "cd_mul": 0.8, "low": false},
			{"name": "Floating Passage", "moves": [["flurry", 1.0], ["dashSlash", 0.7], ["perilThrust", 0.5]], "guard": 0.3, "dist": 2.4, "strafe": 0.4, "cd_mul": 0.7, "low": false},
		],
		"blink": [
			{"name": "Phantom", "moves": [["blinkStrike", 1.0], ["double", 0.4]], "guard": 0.15, "dist": 3.0, "strafe": 0.6, "cd_mul": 0.9, "low": false},
			{"name": "Pursuit", "moves": [["blinkFlurry", 1.0], ["blinkStrike", 0.6]], "guard": 0.1, "dist": 2.2, "strafe": 0.4, "cd_mul": 0.7, "low": false},
		],
		"shuriken": [
			{"name": "Rain of Digits", "moves": [["throw3", 1.0], ["vanish", 0.4]], "guard": 0.1, "dist": 7.0, "strafe": 0.7, "cd_mul": 0.9, "low": false},
			{"name": "Close Quarters", "moves": [["slash", 1.0], ["vanish", 0.9]], "guard": 0.2, "dist": 1.8, "strafe": 0.3, "cd_mul": 1.0, "low": false},
		],
		"smoke": [
			{"name": "Mirage", "moves": [["smokeSplit", 1.0], ["double", 0.6]], "guard": 0.2, "dist": 2.4, "strafe": 0.5, "cd_mul": 1.0, "low": false},
			{"name": "Ambush", "moves": [["blinkStrike", 1.0], ["smokeSplit", 0.5]], "guard": 0.1, "dist": 3.0, "strafe": 0.5, "cd_mul": 0.8, "low": false},
		],
		# one long phase: the third number is the health fraction below which that move unlocks
		"mugen": [
			{"name": "Unlimited", "moves": [["combo3", 1.0], ["flurry", 0.7], ["blinkChain", 0.9], ["blue", 0.6, 0.7], ["red", 0.6, 0.7], ["purple", 0.5, 0.4]],
				"guard": 0.35, "dist": 2.2, "strafe": 0.6, "cd_mul": 0.8, "low": false},
		],
		"boss2": [
			{"name": "Tomoe Blade", "moves": [["combo3", 1.0], ["flurry", 0.7], ["perilSweep", 0.5]], "guard": 0.45, "dist": 1.9, "strafe": 0.5, "cd_mul": 0.7, "low": false},
			{"name": "Lightning", "moves": [["leapStab", 1.0], ["flurry", 0.8], ["perilThrust", 0.6], ["perilSweep", 0.6]], "guard": 0.35, "dist": 2.6, "strafe": 0.4, "cd_mul": 0.6, "low": false},
		],
	}


static func templates() -> Dictionary:
	return {
		"grunt": {"name": "Ashina Soldier", "max_hp": 60.0, "max_post": 60.0, "speed": 2.6, "reach": 1.9, "wp": "katana", "deflect": 0.0, "marks": 1, "hat": "jingasa", "col": Color("c4bcab"), "cd": Vector2(1.2, 2.2), "sets": "grunt", "sc": 1.0},
		"spear": {"name": "Ashina Spearman", "max_hp": 70.0, "max_post": 70.0, "speed": 2.4, "reach": 2.8, "wp": "yari", "deflect": 0.0, "marks": 1, "hat": "jingasa", "col": Color("c4bcab"), "cd": Vector2(1.4, 2.4), "sets": "spear", "sc": 1.0},
		"ronin": {"name": "Wandering Ronin", "max_hp": 95.0, "max_post": 85.0, "speed": 2.4, "reach": 2.35, "wp": "nodachi", "deflect": 0.15, "marks": 1, "hat": "knot", "col": Color("b8c4d8"), "cd": Vector2(1.3, 2.3), "sets": "ronin", "sc": 1.06},
		"boss": {"name": "Genichiro Ashina", "sub": "Way of Tomoe · he learns how you fight", "max_hp": 220.0, "max_post": 160.0, "speed": 3.6, "reach": 2.2, "wp": "tomoe", "deflect": 0.3, "marks": 2, "hat": "crest", "col": Color("f3dccb"), "cd": Vector2(0.6, 1.3), "sets": "boss1", "sc": 1.12, "boss": true, "adaptive": true},
		"blink": {"name": "Void Ninja", "max_hp": 45.0, "max_post": 50.0, "speed": 3.6, "reach": 1.5, "wp": "kunai", "deflect": 0.1, "marks": 1, "hat": "hood", "col": Color("a99cf0"), "cd": Vector2(1.0, 1.8), "sets": "blink", "sc": 0.96},
		"shuriken": {"name": "Shuriken Ninja", "max_hp": 40.0, "max_post": 45.0, "speed": 3.4, "reach": 1.5, "wp": "kunai", "deflect": 0.1, "marks": 1, "hat": "hood", "col": Color("b8a8ff"), "cd": Vector2(1.2, 2.0), "sets": "shuriken", "sc": 0.96},
		"smoke": {"name": "Smoke Ninja", "max_hp": 50.0, "max_post": 50.0, "speed": 3.4, "reach": 1.5, "wp": "kunai", "deflect": 0.1, "marks": 1, "hat": "hood", "col": Color("c9c2e8"), "cd": Vector2(1.2, 2.0), "sets": "smoke", "sc": 0.96},
		"mugen": {"name": "Mugen Ashina", "sub": "Sword of the Unlimited Void", "max_hp": 260.0, "max_post": 180.0, "speed": 4.0, "reach": 2.3, "wp": "mugen", "deflect": 0.25, "marks": 2, "hat": "blindfold", "col": Color("e8f1ff"), "cd": Vector2(0.6, 1.2), "sets": "mugen", "sc": 1.1, "boss": true},
	}


static func codes(s: String) -> Array:
	var out := []
	for c in s:
		out.append(c.unicode_at(0))
	return out


static func weapon(n: String, blen: float, color: Color, butt: float) -> Dictionary:
	var c := codes(n)
	var parts := PackedStringArray()
	for x in c:
		parts.append(str(x))
	return {"name": n, "codes": c, "str": " ".join(parts) + "  ", "len": blen, "color": color, "butt": butt}


## Every blade is its weapon's name written as ASCII codes.
static func weapons() -> Dictionary:
	return {
		"kusabimaru": weapon("KUSABIMARU", 0.88, Color("8fe6f2"), 0.22),
		"katana": weapon("KATANA", 0.8, Color("f3a36f"), 0.2),
		"yari": weapon("YARI", 1.5, Color("f3a36f"), 0.95),
		"nodachi": weapon("NODACHI", 1.25, Color("f3a36f"), 0.3),
		"tomoe": weapon("TOMOE", 0.98, Color("f3dccb"), 0.24),
		"kunai": weapon("KUNAI", 0.38, Color("b9a5ff"), 0.1),
		"mugen": weapon("MUGEN", 1.0, Color("7fd8ff"), 0.26),
	}
