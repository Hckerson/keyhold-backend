export const PROPERTY_IMAGES: readonly string[] = [
    'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80',
    'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&q=80',
    'https://images.unsplash.com/photo-1580216643062-cf460548a66a?w=800&q=80',
    'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1732414/pexels-photo-1732414.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80',
    'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80',
    'https://images.unsplash.com/photo-1449844908441-8829872d2607?w=800&q=80',
    'https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800&q=80',
];

export const CLIENT_PORTRAITS: readonly string[] = [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&q=80',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80',
    'https://images.unsplash.com/photo-1546525848-3ce03ca516f6?w=400&q=80',
    'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&q=80',
];

export const DOCUMENT_IMAGES: readonly string[] = [
    'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80',
    'https://images.unsplash.com/photo-1568234928966-359c35dd8327?w=800&q=80',
    'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&q=80',
];

export const pick = <T>(pool: readonly T[], seed: number): T =>
    pool[((seed % pool.length) + pool.length) % pool.length];

export const gallery = (seed: number, count: number): string[] =>
    Array.from(
        { length: Math.min(count, PROPERTY_IMAGES.length) },
        (_, index) => pick(PROPERTY_IMAGES, seed + index),
    );
