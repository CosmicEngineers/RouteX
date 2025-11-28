"""
HPCL Coastal Tanker Optimization - Maritime Distance Calculator
Uses searoute-py for realistic sea distances between Indian coastal ports
"""

import asyncio
from typing import Dict, List, Tuple, Optional
import numpy as np
try:
    from searoute import searoute
except ImportError:
    searoute = None
    print("Warning: searoute-py not available, using geodesic distances only")
import json
from datetime import datetime
from ..models.database import DistanceMatrixDB
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class HPCLMaritimeDistanceCalculator:
    """
    HPCL-Specific Maritime Distance Calculator
    Calculates realistic sea routes between 6 loading and 11 unloading ports
    """
    
    def __init__(self):
        self.distance_matrix: Dict[str, Dict[str, float]] = {}
        self.route_coordinates: Dict[str, List[List[float]]] = {}
        self.calculation_cache: Dict[str, Dict] = {}
        
    async def calculate_distance_matrix(self, ports: List[Dict]) -> Dict[str, any]:
        """
        Calculate complete distance matrix for HPCL ports
        Returns: Distance matrix + route coordinates for visualization
        """
        logger.info("Starting HPCL maritime distance matrix calculation...")
        
        # Check if we have cached results
        cached_matrix = await DistanceMatrixDB.get_distance_matrix()
        if cached_matrix and self._is_matrix_valid(cached_matrix, ports):
            logger.info("Using cached distance matrix")
            return cached_matrix
        
        # Initialize matrices
        self.distance_matrix = {}
        self.route_coordinates = {}
        
        # Calculate distances for all port pairs
        total_pairs = len(ports) * (len(ports) - 1)
        calculated_pairs = 0
        
        for origin_port in ports:
            origin_id = origin_port['port_id']
            self.distance_matrix[origin_id] = {}
            
            for dest_port in ports:
                dest_id = dest_port['port_id']
                
                if origin_id == dest_id:
                    # Same port - zero distance
                    self.distance_matrix[origin_id][dest_id] = 0.0
                    continue
                
                # Calculate sea route
                try:
                    route_data = await self._calculate_sea_route(
                        origin_port, dest_port
                    )
                    
                    self.distance_matrix[origin_id][dest_id] = route_data['distance_nm']
                    
                    # Store coordinates for visualization
                    route_key = f"{origin_id}_{dest_id}"
                    self.route_coordinates[route_key] = route_data['coordinates']
                    
                    calculated_pairs += 1
                    if calculated_pairs % 10 == 0:
                        logger.info(f"Calculated {calculated_pairs}/{total_pairs} routes")
                        
                except Exception as e:
                    logger.warning(f"Failed to calculate route {origin_id} -> {dest_id}: {e}")
                    # Use Haversine distance as fallback
                    fallback_distance = self._haversine_distance(
                        origin_port['latitude'], origin_port['longitude'],
                        dest_port['latitude'], dest_port['longitude']
                    )
                    self.distance_matrix[origin_id][dest_id] = fallback_distance
        
        # Prepare result
        result = {
            'port_pairs': self.distance_matrix,
            'route_coordinates': self.route_coordinates,
            'last_updated': datetime.now(),
            'total_ports': len(ports),
            'calculation_method': 'searoute_with_haversine_fallback'
        }
        
        # Save to database
        await DistanceMatrixDB.save_distance_matrix(result)
        logger.info(f"Distance matrix calculation completed: {calculated_pairs} routes")
        
        return result
    
    async def _calculate_sea_route(self, origin_port: Dict, dest_port: Dict) -> Dict:
        """
        Calculate single sea route using searoute-py
        """
        origin_coords = [origin_port['longitude'], origin_port['latitude']]
        dest_coords = [dest_port['longitude'], dest_port['latitude']]
        
        try:
            # Use searoute for realistic maritime path if available
            if searoute is not None:
                route = searoute(origin_coords, dest_coords)
                
                if route and hasattr(route, 'geometry') and hasattr(route, 'properties'):
                    # Extract distance (convert km to nautical miles)
                    distance_km = route.properties.get('length', 0)
                    distance_nm = distance_km * 0.539957  # km to nautical miles
                    
                    # Extract coordinates for visualization
                    coordinates = []
                    if route.geometry and route.geometry.get('coordinates'):
                        coordinates = route.geometry['coordinates']
                    
                    return {
                        'distance_nm': distance_nm,
                        'coordinates': coordinates,
                        'method': 'searoute'
                    }
                else:
                    raise Exception("Invalid searoute response")
            else:
                # Fallback to Haversine when searoute not available
                raise Exception("searoute not available, using fallback")
                
        except Exception as e:
            logger.warning(f"Searoute failed for {origin_port['name']} -> {dest_port['name']}: {e}")
            raise e
    
    def _haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate Haversine distance as fallback (in nautical miles)
        """
        # Convert decimal degrees to radians
        lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
        c = 2 * np.arcsin(np.sqrt(a))
        
        # Radius of earth in nautical miles
        r_nm = 3440.065
        
        return c * r_nm
    
    def _is_matrix_valid(self, cached_matrix: Dict, current_ports: List[Dict]) -> bool:
        """
        Check if cached distance matrix is still valid
        """
        if not cached_matrix or 'port_pairs' not in cached_matrix:
            return False
        
        # Check if all required ports are in the matrix
        port_ids = {port['port_id'] for port in current_ports}
        matrix_ports = set(cached_matrix['port_pairs'].keys())
        
        return port_ids.issubset(matrix_ports)
    
    async def get_distance(self, origin_port_id: str, dest_port_id: str, round_trip: bool = False) -> float:
        """
        Get distance between two specific HPCL ports
        If round_trip is True, returns double the distance for return journey
        """
        if origin_port_id in self.distance_matrix:
            distance = self.distance_matrix[origin_port_id].get(dest_port_id, 0.0)
            return distance * 2 if round_trip else distance
        
        # Load from database if not in memory
        matrix_data = await DistanceMatrixDB.get_distance_matrix()
        if matrix_data and 'port_pairs' in matrix_data:
            self.distance_matrix = matrix_data['port_pairs']
            distance = self.distance_matrix.get(origin_port_id, {}).get(dest_port_id, 0.0)
            return distance * 2 if round_trip else distance
        
        return 0.0
    
    async def get_route_coordinates(self, origin_port_id: str, dest_port_id: str) -> List[List[float]]:
        """
        Get route coordinates for map visualization
        """
        route_key = f"{origin_port_id}_{dest_port_id}"
        
        if route_key in self.route_coordinates:
            return self.route_coordinates[route_key]
        
        # Load from database if not in memory
        matrix_data = await DistanceMatrixDB.get_distance_matrix()
        if matrix_data and 'route_coordinates' in matrix_data:
            self.route_coordinates = matrix_data['route_coordinates']
            return self.route_coordinates.get(route_key, [])
        
        return []
    
    def get_distance_summary(self) -> Dict[str, any]:
        """
        Get summary statistics of distance matrix
        """
        if not self.distance_matrix:
            return {"status": "not_calculated"}
        
        all_distances = []
        for origin in self.distance_matrix:
            for dest, distance in self.distance_matrix[origin].items():
                if distance > 0:  # Exclude same-port distances
                    all_distances.append(distance)
        
        if not all_distances:
            return {"status": "no_valid_distances"}
        
        return {
            "status": "calculated",
            "total_routes": len(all_distances),
            "min_distance_nm": min(all_distances),
            "max_distance_nm": max(all_distances),
            "avg_distance_nm": sum(all_distances) / len(all_distances),
            "total_ports": len(self.distance_matrix)
        }


class HPCLRouteValidator:
    """
    Validates that calculated routes meet HPCL operational constraints
    """
    
    @staticmethod
    def validate_coastal_route(origin_port: Dict, dest_port: Dict, distance_nm: float) -> Dict[str, any]:
        """
        Validate route for HPCL coastal operations
        """
        validations = {
            "is_valid": True,
            "warnings": [],
            "errors": []
        }
        
        # Check if both ports are in India
        if origin_port.get('country', 'India') != 'India':
            validations["errors"].append("Origin port not in India (cabotage violation)")
            validations["is_valid"] = False
        
        if dest_port.get('country', 'India') != 'India':
            validations["errors"].append("Destination port not in India (cabotage violation)")
            validations["is_valid"] = False
        
        # Check reasonable distance for coastal shipping
        if distance_nm > 2000:  # Very long coastal route
            validations["warnings"].append(f"Very long coastal route: {distance_nm:.0f} NM")
        
        if distance_nm < 10:  # Very short route
            validations["warnings"].append(f"Very short route: {distance_nm:.0f} NM")
        
        # Check draft limitations
        vessel_draft = 12.0  # Typical HPCL coastal tanker draft
        if origin_port.get('draft_limitation', 15) < vessel_draft:
            validations["errors"].append(f"Origin port draft limitation insufficient: {origin_port.get('draft_limitation')}m")
            validations["is_valid"] = False
        
        if dest_port.get('draft_limitation', 15) < vessel_draft:
            validations["errors"].append(f"Destination port draft limitation insufficient: {dest_port.get('draft_limitation')}m")
            validations["is_valid"] = False
        
        return validations
    
    @staticmethod
    def validate_hpcl_constraints(route_data: Dict) -> Dict[str, any]:
        """
        Validate route against HPCL-specific constraints
        """
        validations = {
            "is_valid": True,
            "constraint_violations": []
        }
        
        # Single loading port constraint
        loading_ports = route_data.get('loading_ports', [])
        if len(loading_ports) > 1:
            validations["constraint_violations"].append("Multiple loading ports not allowed (HPCL constraint)")
            validations["is_valid"] = False
        
        # Max 2 discharge ports constraint
        discharge_ports = route_data.get('discharge_ports', [])
        if len(discharge_ports) > 2:
            validations["constraint_violations"].append("More than 2 discharge ports not allowed (HPCL constraint)")
            validations["is_valid"] = False
        
        return validations


# Initialize global distance calculator
hpcl_distance_calculator = HPCLMaritimeDistanceCalculator()


async def calculate_hpcl_distance_matrix(ports: List[Dict]) -> Dict[str, any]:
    """
    Main function to calculate HPCL maritime distance matrix
    """
    return await hpcl_distance_calculator.calculate_distance_matrix(ports)


async def get_hpcl_route_distance(origin_id: str, dest_id: str, round_trip: bool = False) -> float:
    """
    Get distance between HPCL ports
    If round_trip is True, returns double the distance
    """
    return await hpcl_distance_calculator.get_distance(origin_id, dest_id, round_trip)


async def get_hpcl_route_coordinates(origin_id: str, dest_id: str) -> List[List[float]]:
    """
    Get route coordinates for HPCL visualization
    """
    return await hpcl_distance_calculator.get_route_coordinates(origin_id, dest_id)
