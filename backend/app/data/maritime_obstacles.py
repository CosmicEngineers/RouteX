"""
HPCL Maritime Obstacles Database
Static obstacle data for Indian coastal waters
Includes islands, shallow waters, and restricted zones
"""

from typing import List, Dict

# Major islands and landmasses along Indian coast
INDIAN_COASTAL_OBSTACLES = [
    # Gujarat Coast
    {
        'name': 'Diu Island',
        'lat': 20.7144,
        'lon': 70.9886,
        'radius_km': 3.0,
        'type': 'island'
    },
    {
        'name': 'Gulf of Khambhat Shallows',
        'lat': 21.5,
        'lon': 72.0,
        'radius_km': 15.0,
        'type': 'shallow'
    },
    
    # Maharashtra Coast
    {
        'name': 'Mumbai Harbor Approaches',
        'lat': 18.95,
        'lon': 72.82,
        'radius_km': 2.0,
        'type': 'restricted'
    },
    
    # Goa Coast
    {
        'name': 'Grande Island',
        'lat': 15.2767,
        'lon': 73.6967,
        'radius_km': 1.5,
        'type': 'island'
    },
    
    # Karnataka Coast
    {
        'name': 'St. Mary Islands',
        'lat': 13.7969,
        'lon': 74.7356,
        'radius_km': 1.0,
        'type': 'island'
    },
    
    # Kerala Coast
    {
        'name': 'Lakshadweep Approaches',
        'lat': 11.0,
        'lon': 72.5,
        'radius_km': 20.0,
        'type': 'island'
    },
    {
        'name': 'Cochin Harbor Shallow',
        'lat': 9.95,
        'lon': 76.25,
        'radius_km': 2.0,
        'type': 'shallow'
    },
    
    # Tamil Nadu Coast
    {
        'name': 'Gulf of Mannar Shallows',
        'lat': 9.0,
        'lon': 78.5,
        'radius_km': 10.0,
        'type': 'shallow'
    },
    {
        'name': 'Palk Strait Shallows',
        'lat': 9.5,
        'lon': 79.5,
        'radius_km': 15.0,
        'type': 'shallow'
    },
    
    # Andhra Pradesh Coast
    {
        'name': 'Krishna River Delta',
        'lat': 16.0,
        'lon': 81.2,
        'radius_km': 5.0,
        'type': 'shallow'
    },
    {
        'name': 'Godavari Delta',
        'lat': 16.7,
        'lon': 82.2,
        'radius_km': 5.0,
        'type': 'shallow'
    },
    
    # Odisha Coast
    {
        'name': 'Chilika Lake Mouth',
        'lat': 19.7,
        'lon': 85.3,
        'radius_km': 3.0,
        'type': 'shallow'
    },
    {
        'name': 'Mahanadi Delta',
        'lat': 20.3,
        'lon': 86.7,
        'radius_km': 4.0,
        'type': 'shallow'
    },
    
    # West Bengal Coast
    {
        'name': 'Sagar Island',
        'lat': 21.6467,
        'lon': 88.0467,
        'radius_km': 4.0,
        'type': 'island'
    },
    {
        'name': 'Sundarbans Delta',
        'lat': 21.8,
        'lon': 88.8,
        'radius_km': 20.0,
        'type': 'shallow'
    },
    
    # Andaman & Nicobar (if including)
    {
        'name': 'Andaman Islands North',
        'lat': 13.0,
        'lon': 93.0,
        'radius_km': 30.0,
        'type': 'island'
    },
    {
        'name': 'Nicobar Islands',
        'lat': 8.0,
        'lon': 93.5,
        'radius_km': 25.0,
        'type': 'island'
    },
]

# Restricted zones (naval, fishing, etc.)
RESTRICTED_ZONES = [
    {
        'name': 'Mumbai Naval Base',
        'lat': 18.9388,
        'lon': 72.8354,
        'radius_km': 2.0,
        'type': 'restricted'
    },
    {
        'name': 'Karwar Naval Base',
        'lat': 14.8076,
        'lon': 74.1240,
        'radius_km': 3.0,
        'type': 'restricted'
    },
    {
        'name': 'Visakhapatnam Naval Base',
        'lat': 17.6833,
        'lon': 83.2167,
        'radius_km': 3.0,
        'type': 'restricted'
    },
]

# High-risk shallow water areas
SHALLOW_WATER_ZONES = [
    {
        'name': 'Gulf of Kutch Shallows',
        'lat': 22.5,
        'lon': 69.5,
        'radius_km': 20.0,
        'type': 'shallow',
        'depth_m': 8.0
    },
    {
        'name': 'Rann of Kutch Coast',
        'lat': 23.5,
        'lon': 68.5,
        'radius_km': 25.0,
        'type': 'shallow',
        'depth_m': 5.0
    },
]


def get_all_obstacles() -> List[Dict]:
    """
    Get complete obstacle database for Indian coastal waters
    
    Returns:
        List of all obstacle definitions
    """
    return INDIAN_COASTAL_OBSTACLES + RESTRICTED_ZONES + SHALLOW_WATER_ZONES


def get_obstacles_for_region(lat_min: float, lat_max: float, 
                             lon_min: float, lon_max: float) -> List[Dict]:
    """
    Get obstacles within specific region
    
    Args:
        lat_min, lat_max: Latitude bounds
        lon_min, lon_max: Longitude bounds
        
    Returns:
        List of obstacles in region
    """
    all_obstacles = get_all_obstacles()
    
    regional_obstacles = []
    for obstacle in all_obstacles:
        if (lat_min <= obstacle['lat'] <= lat_max and 
            lon_min <= obstacle['lon'] <= lon_max):
            regional_obstacles.append(obstacle)
    
    return regional_obstacles


def get_obstacles_by_type(obstacle_type: str) -> List[Dict]:
    """
    Get obstacles of specific type
    
    Args:
        obstacle_type: 'island', 'shallow', or 'restricted'
        
    Returns:
        List of obstacles of specified type
    """
    all_obstacles = get_all_obstacles()
    return [obs for obs in all_obstacles if obs['type'] == obstacle_type]


def get_obstacle_summary() -> Dict:
    """
    Get summary statistics of obstacle database
    
    Returns:
        Dictionary with obstacle counts by type
    """
    all_obstacles = get_all_obstacles()
    
    summary = {
        'total': len(all_obstacles),
        'islands': len([o for o in all_obstacles if o['type'] == 'island']),
        'shallow': len([o for o in all_obstacles if o['type'] == 'shallow']),
        'restricted': len([o for o in all_obstacles if o['type'] == 'restricted']),
        'coverage': 'Indian Coastal Waters (8°N to 23°N, 68°E to 88°E)'
    }
    
    return summary
