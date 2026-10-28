"""Server-owned village prices and dated, finite material orders."""
from datetime import datetime
from zoneinfo import ZoneInfo
from .farming import CROPS
from .ranching import PRODUCTS, FEED_PRICE

ORDER_DEFINITIONS = [
    {'id': 'timber', 'title': '给货架添一层木香', 'item': 'wood', 'amount': 6, 'gold': 18, 'note': '米拉想把空货架修好，摆上村民们的新收获。'},
    {'id': 'masonry', 'title': '补好门前的小石路', 'item': 'stone', 'amount': 4, 'gold': 20, 'note': '雨天也能干干净净地进店，这些石料正好派上用场。'},
    {'id': 'supper', 'title': '今晚的蔬菜浓汤', 'item': 'crop', 'amount': 4, 'gold': 24, 'note': '给旅人公会送去新鲜萝卜，晚餐就有着落了。'},
]

def market_view(state, now):
    from .combat import SELL
    from .tools import MATERIALS
    day = datetime.fromtimestamp(now, ZoneInfo('Asia/Shanghai')).date().isoformat()
    return {
        'date': day, 'timezone': 'Asia/Shanghai',
        'buy': {**{c['seed']:c['buy'] for c in CROPS}, 'animal_feed': FEED_PRICE},
        'sell': {**{c['item']:c['sell'] * (100 + 10 * (state['buildings']['workshop']-1)) // 100 for c in CROPS}, 'wood': 2, 'stone': 3, 'plank': 8, **{k:v['sell'] for k,v in MATERIALS.items()},
                 **{k: v for k, v in SELL.items() if k not in ['stone_sword','reinforced_sword','spring_spear','glow_staff']},
                 **{k: p['sell'] for k, p in PRODUCTS.items()},
                 **{'fine_' + k: p['sell'] * 3 // 2 for k, p in PRODUCTS.items()}},
        'orders': [{**o, 'completed': state.get('market_orders', {}).get(o['id']) == day} for o in ORDER_DEFINITIONS],
    }
