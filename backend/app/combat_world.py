"""Fixed five-floor geography; no monsters live in ordinary world maps."""
CAVE_ENTRY = {'id': 'cave_entry', 'kind': 'cave', 'name': '石根山洞 · 主动进入战斗区',
              'x': 304, 'y': 1160, 'destination': 'cave_1'}
CAVE_MAPS = {}
for floor in range(1, 6):
    objects = [
        {'id': 'cave_exit', 'kind': 'cave', 'name': '返回洞口 · 安全撤离', 'x': 64, 'y': 384, 'destination': 'overworld'},
        {'id': 'cave_down', 'kind': 'cave', 'name': '前往下一层' if floor < 5 else '底层出口', 'x': 576, 'y': 96,
         'destination': f'cave_{floor+1}' if floor < 5 else 'overworld'},
    ]
    if floor == 1:
        objects += [{'id': 'cave_rope', 'kind': 'cave', 'name': '洞内绳梯 · 第3层', 'x': 64, 'y': 280, 'destination': 'cave_3'},
                    {'id': 'cave_deep', 'kind': 'cave', 'name': '深层通路 · 第5层', 'x': 64, 'y': 216, 'destination': 'cave_5'}]
    if floor == 3:
        objects.append({'id': 'cave_rest', 'kind': 'cave', 'name': '安全平台 · 短休', 'x': 64, 'y': 280})
    CAVE_MAPS[f'cave_{floor}'] = {'id': f'cave_{floor}', 'name': f'石根山洞 · 第{floor}层',
        'width': 640, 'height': 448, 'tile': 16, 'spawn': {'x': 64, 'y': 352},
        'objects': objects, 'trees': [], 'furniture': [],
        'obstacles': [[0, 0, 640, 40], [0, 40, 24, 408], [616, 40, 24, 408], [0, 424, 640, 24],
                      [288, 80, 48, 80], [352, 304, 48, 72]] if floor < 5 else
                     [[0, 0, 640, 40], [0, 40, 24, 408], [616, 40, 24, 408], [0, 424, 640, 24]]}
