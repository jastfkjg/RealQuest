"""Server-owned village prices and dated, finite material orders."""
from datetime import datetime
from zoneinfo import ZoneInfo

ORDER_DEFINITIONS = [
    {'id': 'timber', 'title': '给货架添一层木香', 'item': 'wood', 'amount': 6, 'gold': 18, 'note': '米拉想把空货架修好，摆上村民们的新收获。'},
    {'id': 'masonry', 'title': '补好门前的小石路', 'item': 'stone', 'amount': 4, 'gold': 20, 'note': '雨天也能干干净净地进店，这些石料正好派上用场。'},
    {'id': 'supper', 'title': '今晚的蔬菜浓汤', 'item': 'crop', 'amount': 4, 'gold': 44, 'note': '给旅人公会送去新鲜萝卜，晚餐就有着落了。'},
]

def market_view(state, now):
    from .combat import SELL
    day = datetime.fromtimestamp(now, ZoneInfo('Asia/Shanghai')).date().isoformat()
    return {
        'date': day, 'timezone': 'Asia/Shanghai',
        'buy': {'seed': 2},
        'sell': {'crop': 8 + state['buildings']['workshop'] - 1, 'wood': 2, 'stone': 3, 'plank': 8,
                 **{k: v for k, v in SELL.items() if k not in ['stone_sword','reinforced_sword','spring_spear','glow_staff']}},
        'orders': [{**o, 'completed': state.get('market_orders', {}).get(o['id']) == day} for o in ORDER_DEFINITIONS],
    }
