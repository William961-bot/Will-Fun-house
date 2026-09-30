extends Control
## Screen-space overlay. All drawing lives in main.gd so it can read game state directly.

var main


func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE


func _process(_dt: float) -> void:
	queue_redraw()


func _draw() -> void:
	if main:
		main.draw_hud(self)
