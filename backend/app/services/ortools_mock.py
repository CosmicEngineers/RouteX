"""
Mock ortools module for Python 3.14 compatibility
This allows the app to run without ortools installed
"""

class CpModel:
    """Mock CP-SAT Model"""
    def __init__(self):
        self.vars = {}
        
    def NewBoolVar(self, name):
        """Create a mock boolean variable"""
        return MockVar(name)
    
    def Add(self, constraint):
        """Add a constraint (no-op)"""
        pass
    
    def Minimize(self, objective):
        """Set objective (no-op)"""
        pass
    
    def AddBoolOr(self, vars):
        """Add boolean OR constraint (no-op)"""
        pass


class MockVar:
    """Mock decision variable"""
    def __init__(self, name):
        self.name = name
    
    def __mul__(self, other):
        return self
    
    def __rmul__(self, other):
        return self
    
    def __add__(self, other):
        return self
    
    def __radd__(self, other):
        return self


class CpSolver:
    """Mock CP-SAT Solver"""
    
    OPTIMAL = 'OPTIMAL'
    FEASIBLE = 'FEASIBLE'
    INFEASIBLE = 'INFEASIBLE'
    
    def __init__(self):
        self.parameters = MockParameters()
    
    def Solve(self, model):
        """Mock solve - returns optimal status"""
        return self.OPTIMAL
    
    def Value(self, var):
        """Mock value - returns 1 for some variables"""
        import random
        return random.choice([0, 1])
    
    def ObjectiveValue(self):
        """Mock objective value"""
        return 1500000.0
    
    def WallTime(self):
        """Mock wall time"""
        return 2.5


class MockParameters:
    """Mock solver parameters"""
    def __init__(self):
        self.max_time_in_seconds = 300
        self.num_search_workers = 8


class cp_model:
    """Mock cp_model module"""
    CpModel = CpModel
    CpSolver = CpSolver
