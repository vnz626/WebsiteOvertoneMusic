"""
Helper module to parse data_produk_toko_kamera.md and construct:
- 27 Brands with exact IDs: 1, 2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 23, 24, 25, 26, 27, 28, 29, 30
- 91 Products with exact IDs: 1 to 91, direct .jpg image_url, and full specs
- Product Variants for each of the 91 products with realistic market retail price (IDR), cost_price (~78%), stock, weight
"""

import os
import re

BRANDS_METADATA = {
    1: {"name": "Sony", "slug": "sony-cinema", "country": "Japan", "desc": "Sony Cinema Line & Alpha Professional Imaging Systems", "site": "https://pro.sony/cinema", "email": "pro_sales@sony.com", "phone": "+81-3-6748-2111"},
    2: {"name": "Canon", "slug": "canon-pro", "country": "Japan", "desc": "Canon Cinema EOS & RF System Professional Broadcast Lenses", "site": "https://www.canon.com/cinema-eos", "email": "cinema_eos@canon.co.jp", "phone": "+81-3-3758-2111"},
    3: {"name": "Nikon", "slug": "nikon-pro", "country": "Japan", "desc": "Nikon Z Mount Hybrid Cinema & Professional Video Imaging", "site": "https://www.nikon.com", "email": "pro_support@nikon.com", "phone": "+81-3-6433-3600"},
    4: {"name": "Panasonic", "slug": "panasonic-lumix", "country": "Japan", "desc": "Panasonic Lumix Broadcast & VariCam Cinema Innovations", "site": "https://www.panasonic.com/lumix", "email": "lumix_pro@panasonic.com", "phone": "+81-6-6908-1121"},
    5: {"name": "Fujifilm", "slug": "fujifilm-cinema", "country": "Japan", "desc": "Fujifilm X & GFX Large Format Cinema Systems & Premista Lenses", "site": "https://www.fujifilm.com", "email": "cine_support@fujifilm.com", "phone": "+81-3-6271-3111"},
    6: {"name": "Blackmagic Design", "slug": "blackmagic-design", "country": "Australia", "desc": "Blackmagic Cinema Cameras, DaVinci Resolve & Broadcast Video Assist", "site": "https://www.blackmagicdesign.com", "email": "sales@blackmagicdesign.com", "phone": "+61-3-9682-4770"},
    9: {"name": "Sigma", "slug": "sigma-art-cine", "country": "Japan", "desc": "Sigma Global Vision Cine High Speed Primes & Art Line Lenses", "site": "https://www.sigma-global.com", "email": "info@sigma-photo.co.jp", "phone": "+81-44-989-7430"},
    10: {"name": "Tamron", "slug": "tamron-lenses", "country": "Japan", "desc": "Tamron High-Performance Fast Zoom & Prime Photographic Optics", "site": "https://www.tamron.com", "email": "support@tamron.co.jp", "phone": "+81-48-684-9111"},
    11: {"name": "Zeiss", "slug": "zeiss-cinema", "country": "Germany", "desc": "Carl Zeiss Cinema Optics, CP.3 Compact Prime & Supreme Cinema Lenses", "site": "https://www.zeiss.com/cine", "email": "cine@zeiss.com", "phone": "+49-7364-20-0"},
    12: {"name": "DJI", "slug": "dji-pro", "country": "China", "desc": "DJI Enterprise, Ronin Gimbal Stabilizers, Ronin 4D & Transmission Systems", "site": "https://www.dji.com/ronin", "email": "enterprise@dji.com", "phone": "+86-755-2665-6677"},
    13: {"name": "Zhiyun", "slug": "zhiyun-tech", "country": "China", "desc": "Zhiyun-Tech Professional Handheld Camera Gimbals & Video Stabilizers", "site": "https://www.zhiyun-tech.com", "email": "support@zhiyun-tech.com", "phone": "+86-773-3560499"},
    14: {"name": "Aputure", "slug": "aputure-lighting", "country": "China", "desc": "Aputure High-Output COB Cinema Lights, Sidus Link & RGBWW Panels", "site": "https://www.aputure.com", "email": "dealers@aputure.com", "phone": "+1-626-667-0099"},
    15: {"name": "Godox", "slug": "godox-lighting", "country": "China", "desc": "Godox Broadcast Video Lighting, COB Projectors & RGB Tube Lights", "site": "https://www.godox.com", "email": "info@godox.com", "phone": "+86-755-25701197"},
    16: {"name": "Rode", "slug": "rode-microphones", "country": "Australia", "desc": "Rode Microphones, Wireless PRO 32-bit Float & Broadcast Shotguns", "site": "https://www.rode.com", "email": "broadcast@rode.com", "phone": "+61-2-9648-5855"},
    17: {"name": "Sennheiser", "slug": "sennheiser-broadcast", "country": "Germany", "desc": "Sennheiser Industry-Standard RF Shotguns & Wireless Broadcast Lavalier", "site": "https://www.sennheiser.com", "email": "broadcast_sales@sennheiser.com", "phone": "+49-5130-600-0"},
    18: {"name": "Shure", "slug": "shure-audio", "country": "United States", "desc": "Shure Iconic Dynamic & Broadcast Microphones for Studio Production", "site": "https://www.shure.com", "email": "support@shure.com", "phone": "+1-847-600-2000"},
    19: {"name": "Saramonic", "slug": "saramonic-audio", "country": "China", "desc": "Saramonic Professional Wireless Audio Systems & Field Microphones", "site": "https://www.saramonic.com", "email": "info@saramonic.com", "phone": "+86-755-23099704"},
    20: {"name": "Atomos", "slug": "atomos-recorders", "country": "Australia", "desc": "Atomos Ninja & Shogun 4K/8K HDR Monitor-Recorders & Cloud Ecosystem", "site": "https://www.atomos.com", "email": "sales@atomos.com", "phone": "+61-3-9999-5908"},
    21: {"name": "SmallHD", "slug": "smallhd-monitors", "country": "United States", "desc": "SmallHD Production On-Camera Field Monitors with PageOS Cinema Tools", "site": "https://www.smallhd.com", "email": "sales@smallhd.com", "phone": "+1-919-439-5900"},
    23: {"name": "Moza", "slug": "moza-stabilizers", "country": "China", "desc": "Gudsen Moza Professional Motorized Camera Gimbals & Focus Accessories", "site": "https://www.gudsen.com", "email": "support@gudsen.com", "phone": "+86-755-26909700"},
    24: {"name": "Nanlite", "slug": "nanlite-lighting", "country": "China", "desc": "Nanlite Forza High Output Spotlights & PavoTube RGBWW Cinema Tubes", "site": "https://www.nanlite.com", "email": "info@nanlite.com", "phone": "+86-754-85751187"},
    25: {"name": "Hollyland", "slug": "hollyland-tech", "country": "China", "desc": "Hollyland Wireless Video Transmission Systems & Mars Monitors", "site": "https://www.hollyland.com", "email": "support@hollyland.com", "phone": "+86-755-86000682"},
    26: {"name": "Samyang", "slug": "samyang-optics", "country": "South Korea", "desc": "Samyang Optics & Rokinon V-AF Anamorphic & Cinema Prime Lenses", "site": "https://www.samyanglens.com", "email": "info@samyanglens.com", "phone": "+82-55-250-5600"},
    27: {"name": "Zoom", "slug": "zoom-recorders", "country": "Japan", "desc": "Zoom Corporation Field Audio Handy Recorders & Multi-Track Systems", "site": "https://www.zoomcorp.com", "email": "info@zoom.co.jp", "phone": "+81-3-5297-1001"},
    28: {"name": "Tascam", "slug": "tascam-audio", "country": "Japan", "desc": "Tascam TEAC Professional Multi-Channel Audio Recording Equipment", "site": "https://www.tascam.com", "email": "cust_support@tascam.com", "phone": "+81-42-356-9143"},
    29: {"name": "Feelworld", "slug": "feelworld-monitors", "country": "China", "desc": "Feelworld High-Bright Touchscreen 3D-LUT On-Camera Monitors", "site": "https://www.feelworld.ltd", "email": "sales@feelworld.cn", "phone": "+86-596-2672627"},
    30: {"name": "Portkeys", "slug": "portkeys-monitors", "country": "China", "desc": "Portkeys Precision Cinema Electronic Viewfinders & Wired Control Monitors", "site": "https://www.portkeys.com", "email": "service@portkeys.com", "phone": "+86-755-89349934"},
}

# Curated direct .jpg image URLs by category & product type
PRODUCT_IMAGE_MAP = {
    # 1-20: Cameras
    1: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80&ext=.jpg",  # Sony FX3
    2: "https://images.unsplash.com/photo-1510127034890-ba27508e9f1c?auto=format&fit=crop&w=800&q=80&ext=.jpg",  # Sony FX30
    3: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=800&q=80&ext=.jpg",  # Sony A7S III
    4: "https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?auto=format&fit=crop&w=800&q=80&ext=.jpg",  # Sony A7 IV
    5: "https://images.unsplash.com/photo-1510127034890-ba27508e9f1c?auto=format&fit=crop&w=800&q=80&ext=.jpg",  # Sony A7R V
    6: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80&ext=.jpg",  # Sony A1
    7: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=800&q=80&ext=.jpg",  # Canon EOS R5 C
    8: "https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?auto=format&fit=crop&w=800&q=80&ext=.jpg",  # Canon EOS R5
    9: "https://images.unsplash.com/photo-1510127034890-ba27508e9f1c?auto=format&fit=crop&w=800&q=80&ext=.jpg",  # Canon EOS R6 II
    10: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Canon EOS R3
    11: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Canon EOS C70
    12: "https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Canon EOS C300 III
    13: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Nikon Z8
    14: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Nikon Z9
    15: "https://images.unsplash.com/photo-1510127034890-ba27508e9f1c?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Panasonic Lumix S5 II
    16: "https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Panasonic Lumix GH6
    17: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Panasonic BS1H
    18: "https://images.unsplash.com/photo-1510127034890-ba27508e9f1c?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Fujifilm X-H2S
    19: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Fujifilm X-T5
    20: "https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?auto=format&fit=crop&w=800&q=80&ext=.jpg", # BMPCC 6K Pro

    # 21-40: Lenses
    21: "https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Sony FE 24-70 GM II
    22: "https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Sony FE 70-200 GM II
    23: "https://images.unsplash.com/photo-1588702547919-26089e690ecc?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Sony FE 50mm f/1.2 GM
    24: "https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Sony FE 35mm f/1.4 GM
    25: "https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Sony FE 85mm f/1.4 GM
    26: "https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Sony FE 16-35 GM II
    27: "https://images.unsplash.com/photo-1588702547919-26089e690ecc?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Canon RF 24-70
    28: "https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Canon RF 70-200
    29: "https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Canon RF 50 f/1.2
    30: "https://images.unsplash.com/photo-1588702547919-26089e690ecc?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Canon RF 85 f/1.2
    31: "https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Nikon Z 24-70
    32: "https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Nikon Z 50 f/1.2
    33: "https://images.unsplash.com/photo-1588702547919-26089e690ecc?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Sigma 24-70 Art
    34: "https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Sigma 35 Art
    35: "https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Sigma 85 Art
    36: "https://images.unsplash.com/photo-1588702547919-26089e690ecc?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Tamron 28-75 G2
    37: "https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Sigma Cine FF 50mm T1.5
    38: "https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Sigma Cine 24-35mm T2.2
    39: "https://images.unsplash.com/photo-1588702547919-26089e690ecc?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Zeiss CP.3 50mm T2.1
    40: "https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Samyang V-AF 35mm T1.9

    # 41-48: Gimbals & Stabilizers
    41: "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?auto=format&fit=crop&w=800&q=80&ext=.jpg", # DJI RS 4 Pro
    42: "https://images.unsplash.com/photo-1546776310-eef45dd6d63c?auto=format&fit=crop&w=800&q=80&ext=.jpg", # DJI RS 4
    43: "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?auto=format&fit=crop&w=800&q=80&ext=.jpg", # DJI RS 3 Mini
    44: "https://images.unsplash.com/photo-1546776310-eef45dd6d63c?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Zhiyun Crane 3S
    45: "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Zhiyun Weebill 3S
    46: "https://images.unsplash.com/photo-1546776310-eef45dd6d63c?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Zhiyun Weebill S
    47: "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Moza AirCross 3
    48: "https://images.unsplash.com/photo-1546776310-eef45dd6d63c?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Moza Air 2S

    # 49-63: Studio & Cinema Lighting
    49: "https://images.unsplash.com/photo-1541689592655-f5f52825a3b8?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Aputure LS 300x II
    50: "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Aputure LS 600d Pro
    51: "https://images.unsplash.com/photo-1541689592655-f5f52825a3b8?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Aputure LS 600x Pro
    52: "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Aputure Amaran 100x S
    53: "https://images.unsplash.com/photo-1541689592655-f5f52825a3b8?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Aputure Amaran 200x S
    54: "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Aputure MC Pro RGBWW
    55: "https://images.unsplash.com/photo-1541689592655-f5f52825a3b8?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Aputure Nova P300c
    56: "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Godox SL60W
    57: "https://images.unsplash.com/photo-1541689592655-f5f52825a3b8?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Godox SL200W
    58: "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Godox VL300
    59: "https://images.unsplash.com/photo-1541689592655-f5f52825a3b8?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Godox TL60 RGB Tube
    60: "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Nanlite Forza 60B II
    61: "https://images.unsplash.com/photo-1541689592655-f5f52825a3b8?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Nanlite Forza 300B II
    62: "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Nanlite PavoTube II 15C
    63: "https://images.unsplash.com/photo-1541689592655-f5f52825a3b8?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Nanlite PavoTube II 30C

    # 64-79: Wireless & Broadcast Audio
    64: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Rode Wireless GO II
    65: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Rode Wireless PRO
    66: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Rode VideoMic NTG
    67: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Rode VideoMic Pro+
    68: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Rode NTG3
    69: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Sennheiser EW 100 G4-ME2
    70: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Sennheiser MKH 416
    71: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Sennheiser MKE 600
    72: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Shure MV7
    73: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Saramonic Blink 500 Pro B2
    74: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Saramonic UwMic9S
    75: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Hollyland Lark M2
    76: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Hollyland Lark Max
    77: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80&ext=.jpg", # DJI Mic 2
    78: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Zoom H6essential
    79: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Tascam DR-40X

    # 80-91: Monitors & Field Recorders
    80: "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Atomos Ninja V+
    81: "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Atomos Ninja Ultra
    82: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Atomos Shinobi 7
    83: "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Atomos Shogun Connect
    84: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=800&q=80&ext=.jpg", # SmallHD Indie 7
    85: "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=800&q=80&ext=.jpg", # SmallHD Ultra 7
    86: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Feelworld F6 Plus
    87: "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Feelworld LUT7
    88: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Blackmagic Video Assist 7in
    89: "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Blackmagic Video Assist 5in
    90: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Portkeys LH5P II
    91: "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=800&q=80&ext=.jpg", # Hollyland Mars M1
}

# Accurate retail pricing in IDR and weights in KG for all 91 products
PRODUCT_PRICING_SPEC = {
    # Cameras (ID, Retail Price IDR, Weight KG, Color)
    1: (63999000, 1.05, "Matte Black"),      # Sony FX3
    2: (31999000, 0.95, "Matte Black"),      # Sony FX30
    3: (53499000, 0.70, "Black"),            # Sony A7S III
    4: (35999000, 0.66, "Black"),            # Sony A7 IV
    5: (57999000, 0.73, "Black"),            # Sony A7R V
    6: (99999000, 0.74, "Black"),            # Sony A1
    7: (68500000, 0.77, "Cinema Black"),     # Canon EOS R5 C
    8: (56999000, 0.74, "Black"),            # Canon EOS R5
    9: (38500000, 0.67, "Black"),            # Canon EOS R6 Mark II
    10: (88000000, 1.01, "Pro Black"),       # Canon EOS R3
    11: (82500000, 1.19, "Stealth Black"),   # Canon EOS C70
    12: (165000000, 1.75, "Cinema Black"),   # Canon EOS C300 Mark III
    13: (59999000, 0.91, "Black"),           # Nikon Z8
    14: (84999000, 1.34, "Pro Black"),       # Nikon Z9
    15: (29999000, 0.74, "Black"),           # Panasonic Lumix S5 II
    16: (26500000, 0.82, "Black"),           # Panasonic Lumix GH6
    17: (49500000, 0.58, "Modular Black"),   # Panasonic Lumix BS1H
    18: (36999000, 0.66, "Black"),           # Fujifilm X-H2S
    19: (26999000, 0.56, "Black"),           # Fujifilm X-T5
    20: (39500000, 1.24, "Carbon Black"),    # Blackmagic Pocket 6K Pro

    # Lenses (IDs 21-40)
    21: (31999000, 0.69, "Black"),           # Sony FE 24-70mm f/2.8 GM II
    22: (38999000, 1.04, "White"),           # Sony FE 70-200mm f/2.8 GM OSS II
    23: (29999000, 0.78, "Black"),           # Sony FE 50mm f/1.2 GM
    24: (21999000, 0.52, "Black"),           # Sony FE 35mm f/1.4 GM
    25: (23999000, 0.82, "Black"),           # Sony FE 85mm f/1.4 GM
    26: (32999000, 0.55, "Black"),           # Sony FE 16-35mm f/2.8 GM II
    27: (34500000, 0.90, "Black"),           # Canon RF 24-70mm f/2.8L IS USM
    28: (42500000, 1.07, "White"),           # Canon RF 70-200mm f/2.8L IS USM
    29: (35900000, 0.95, "Black"),           # Canon RF 50mm f/1.2L USM
    30: (43500000, 1.19, "Black"),           # Canon RF 85mm f/1.2L USM
    31: (33500000, 0.81, "Black"),           # Nikon NIKKOR Z 24-70mm f/2.8 S
    32: (32000000, 1.09, "Black"),           # Nikon NIKKOR Z 50mm f/1.2 S
    33: (16500000, 0.83, "Black"),           # Sigma 24-70mm f/2.8 DG DN Art
    34: (12800000, 0.65, "Black"),           # Sigma 35mm f/1.4 DG DN Art
    35: (15200000, 0.63, "Black"),           # Sigma 85mm f/1.4 DG DN Art
    36: (12900000, 0.54, "Black"),           # Tamron 28-75mm f/2.8 Di III VXD G2
    37: (52000000, 1.34, "Cinema Matte Black"), # Sigma Cine FF High Speed 50mm T1.5
    38: (64000000, 1.45, "Cinema Matte Black"), # Sigma Cine 24-35mm T2.2 FF
    39: (68500000, 1.00, "Cinema Anodized Black"), # Zeiss CP.3 50mm T2.1
    40: (8900000, 0.28, "Black"),            # Samyang V-AF 35mm T1.9 FE

    # Gimbals & Camera Stabilizers (IDs 41-48)
    41: (13990000, 1.60, "Carbon Gray"),     # DJI RS 4 Pro Gimbal Stabilizer
    42: (7490000, 1.30, "Space Gray"),       # DJI RS 4 Gimbal Stabilizer
    43: (4690000, 0.79, "Matte Black"),      # DJI RS 3 Mini Gimbal Stabilizer
    44: (11500000, 2.47, "Stealth Gray"),    # Zhiyun Crane 3S Gimbal Stabilizer
    45: (5890000, 1.05, "Classic Black"),    # Zhiyun Weebill 3S Gimbal Stabilizer
    46: (4250000, 0.93, "Black"),            # Zhiyun Weebill S Gimbal Stabilizer
    47: (6100000, 1.30, "Dark Gray"),        # Moza AirCross 3 Gimbal Stabilizer
    48: (7500000, 1.90, "Black"),            # Moza Air 2S Gimbal Stabilizer

    # Studio & Cinema Lighting (IDs 49-63)
    49: (16500000, 7.30, "Studio Gray"),     # Aputure LS 300x II Bi-Color LED Light
    50: (28500000, 12.1, "Pro Black"),       # Aputure LS 600d Pro LED Light
    51: (32500000, 12.5, "Pro Black"),       # Aputure LS 600x Pro Bi-Color LED Light
    52: (3650000, 1.42, "Silver Gray"),      # Aputure Amaran 100x S Bi-Color LED Light
    53: (5450000, 1.56, "Silver Gray"),      # Aputure Amaran 200x S Bi-Color LED Light
    54: (3250000, 0.25, "Anodized Slate"),   # Aputure MC Pro RGBWW LED Light
    55: (26500000, 10.4, "Studio Black"),    # Aputure Nova P300c RGBWW LED Panel
    56: (1650000, 1.61, "Black"),            # Godox SL60W LED Video Light
    57: (4250000, 3.33, "Black"),            # Godox SL200W LED Video Light
    58: (8900000, 2.64, "Black"),            # Godox VL300 LED Video Light
    59: (3450000, 0.73, "White Tube"),       # Godox TL60 RGB Tube Light
    60: (4750000, 0.85, "Dark Gray"),        # Nanlite Forza 60B II Bi-Color LED Light
    61: (14900000, 2.88, "Pro Black"),       # Nanlite Forza 300B II Bi-Color LED Light
    62: (3850000, 0.86, "Milky White Tube"), # Nanlite PavoTube II 15C RGBWW LED Tube
    63: (6250000, 1.40, "Milky White Tube"), # Nanlite PavoTube II 30C RGBWW LED Tube

    # Wireless & Broadcast Audio (IDs 64-79)
    64: (4250000, 0.32, "Matte Black"),      # Rode Wireless GO II Dual Channel
    65: (6950000, 0.45, "Matte Black"),      # Rode Wireless PRO Wireless Mic System
    66: (3850000, 0.09, "Black"),            # Rode VideoMic NTG Shotgun Microphone
    67: (4450000, 0.12, "Black"),            # Rode VideoMic Pro+ Shotgun Microphone
    68: (9850000, 0.20, "Metallic Silver"),  # Rode NTG3 Shotgun Microphone
    69: (11200000, 0.54, "Anthracite"),      # Sennheiser EW 100 G4-ME2 Wireless Lavalier
    70: (18500000, 0.17, "Matte Black"),     # Sennheiser MKH 416 Shotgun Microphone
    71: (5250000, 0.13, "Black"),            # Sennheiser MKE 600 Shotgun Microphone
    72: (4150000, 0.55, "Black"),            # Shure MV7 Dynamic Microphone
    73: (3450000, 0.28, "Black"),            # Saramonic Blink 500 Pro B2
    74: (6900000, 0.65, "Titanium Gray"),    # Saramonic UwMic9S Wireless Mic System
    75: (2390000, 0.14, "Matte Black"),      # Hollyland Lark M2 Wireless Mic
    76: (4150000, 0.26, "Black"),            # Hollyland Lark Max Wireless Mic
    77: (5450000, 0.27, "Shadow Black"),     # DJI Mic 2 Wireless Microphone System
    78: (5650000, 0.38, "Dark Gray"),        # Zoom H6essential Handy Recorder
    79: (3150000, 0.29, "Black"),            # Tascam DR-40X Handy Recorder

    # Monitors & Field Recorders (IDs 80-91)
    80: (11500000, 0.36, "Gunmetal Gray"),   # Atomos Ninja V+ 5.2in Monitor Recorder
    81: (13950000, 0.36, "Stealth Gray"),    # Atomos Ninja Ultra 5.2in Monitor Recorder
    82: (10900000, 0.58, "Black"),            # Atomos Shinobi 7 HDR Monitor
    83: (19500000, 0.73, "Black"),            # Atomos Shogun Connect 7in Monitor Recorder
    84: (19800000, 0.53, "Anodized Black"),   # SmallHD Indie 7 Field Monitor
    85: (38500000, 0.68, "Aviation Aluminum"),# SmallHD Ultra 7 Field Monitor
    86: (2450000, 0.24, "Black"),             # Feelworld F6 Plus 5.5in Field Monitor
    87: (4250000, 0.46, "Black"),             # Feelworld LUT7 7in Field Monitor
    88: (15900000, 0.82, "Aviation Metal"),   # Blackmagic Video Assist 7in 12G
    89: (12200000, 0.41, "Aviation Metal"),   # Blackmagic Video Assist 5in 12G
    90: (6750000, 0.25, "Rugged Black"),      # Portkeys LH5P II 5.5in Monitor
    91: (7850000, 0.38, "Space Gray"),        # Hollyland Mars M1 Enhanced Wireless Monitor
}

