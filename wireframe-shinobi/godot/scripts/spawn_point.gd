@tool
class_name SpawnPoint
extends Marker3D
## Put one of these under World/Spawns to place an enemy. The enemy faces the marker's +Z axis;
## rotate the marker around Y to turn it. Pick the enemy type in the Inspector.
## Level 1: grunt, spear, ronin, boss (Genichiro).  Level 2: blink, shuriken, smoke (void ninjas), mugen.

@export_enum("grunt", "spear", "ronin", "boss", "blink", "shuriken", "smoke", "mugen") var enemy := "grunt"
