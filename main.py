def energy_optimizer(M, Z, D, X, Y):
    """
    Computes the optimal 24-hour energy schedule to minimize the total electricity bill.
    
    Parameters:
    M (int): Battery capacity
    Z (int): Maximum charge/discharge rate
    D (list of ints): Household demand for each hour (length 24)
    X (list of ints): Solar units generated for each hour (length 24)
    Y (list of floats/ints): Price of electricity for each hour (length 24)
    
    Returns:
    float: The lowest possible total bill
    list of dicts: The hourly action plan

    """
    hours = 24
    
    # Creating a 2D array dp[M+1][hours+1] and filling with the maximum value
    dp = [[float('inf')] * (M + 1) for _ in range(hours + 1)] 
    # Stores money spent
    
    # Creating a replica of dp to store the optimal choices
    choices = [[0] * (M + 1) for _ in range(hours + 1)]
    

    # Base Case: At hour 24, the day is over, no more costs.
    for b in range(M + 1):
        dp[hours][b] = 0
        
    # Work backwards from hour 23 down to 0
    for t in range(hours - 1, -1, -1):
        for b in range(M + 1):
            
            # Test every allowable charging/discharging rate
            for delta_b in range(-Z, Z + 1):
                next_b = b + delta_b
                
                # Enforce battery capacity limits
                if 0 <= next_b <= M:
                    
                    # Net Grid = Demand - Solar + Battery Charge - Battery Discharge
                    # delta_b: Positive = charge, Negative = discharge)
                    net_grid = D[t] - X[t] + delta_b
                    
                    # Calculate cost for this specific hour
                    current_cost = net_grid * Y[t]
                    
                    # Total cost = this hour's cost + optimal cost for the rest of the day
                    total_cost = current_cost + dp[t+1][next_b]
                    
                    # If this is the best (lowest) cost we've seen for this state, save it
                    if total_cost < dp[t][b]:
                        dp[t][b] = total_cost
                        choices[t][b] = delta_b

    # Assuming the battery starts the day completely empty
    lowest_total_bill = dp[0][0]
        
    current_b = 0
    action_plan = []
    
    for t in range(hours):
        # Retrieve the best decision we saved for the current state
        best_delta_b = choices[t][current_b]
        
        # Recalculate the net grid dependency to split into bought/sold
        net_grid = D[t] - X[t] + best_delta_b
        
        bought = net_grid if net_grid > 0 else 0
        sold = abs(net_grid) if net_grid < 0 else 0
        
        charged = best_delta_b if best_delta_b > 0 else 0
        discharged = abs(best_delta_b) if best_delta_b < 0 else 0
        
        # Update battery level for the next hour's iteration
        current_b += best_delta_b
        
        # Record the hourly stats
        action_plan.append({
            "Hour": t,
            "Bought": bought,
            "Sold": sold,
            "Charged": charged,
            "Discharged": discharged,
            "Battery_Level": current_b
        })
        
    return lowest_total_bill, action_plan



if __name__ == "__main__":

    M = 10  # Max battery capacity
    Z = 3   # Max charge/discharge rate

    # 24-hour dummy data
    D = [2, 2, 2, 2, 2, 3, 4, 5, 4, 3, 3, 3, 3, 3, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2]
    X = [0, 0, 0, 0, 0, 0, 1, 3, 5, 6, 7, 8, 8, 7, 5, 3, 1, 0, 0, 0, 0, 0, 0, 0]
    Y = [1, 1, 1, 1, 1, 2, 3, 3, 2, 2, 2, 2, 2, 3, 4, 5, 8, 10, 10, 8, 5, 3, 2, 1]

    final_bill, schedule = energy_optimizer(M, Z, D, X, Y)
    print(f"Lowest Possible 24-Hour Bill: {final_bill} Rupees\n")
    print("Hourly Action Plan:")
    print(f"{'Hour':<6} | {'Bought':<8} | {'Sold':<6} | {'Charged':<9} | {'Discharged':<12} | {'Battery Lvl'}")
    print("-" * 65)
    
    for action in schedule:
        print(f"{action['Hour']:<6} | {action['Bought']:<8} | {action['Sold']:<6} | "
              f"{action['Charged']:<9} | {action['Discharged']:<12} | {action['Battery_Level']}")


import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

# 1. Initialize the app
app = FastAPI(title="Smart Energy Optimizer API")

# Restrict CORS to known origins. Configure extra origins via the
# ALLOWED_ORIGINS env var (comma-separated), e.g. the deployed frontend URL.
_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
_extra = os.environ.get("ALLOWED_ORIGINS", "")
if _extra:
    _origins += [o.strip() for o in _extra.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Define what the incoming data from React should look like
class EnergyRequest(BaseModel):
    M: int
    Z: int
    D: List[int]
    X: List[int]
    Y: List[int]

# (Assume your optimize_energy_schedule function is pasted right here)

# 3. Create the API Endpoint - talk to the web
@app.post("/api/optimize")
def optimize(data: EnergyRequest):
    # Pass the validated data directly into your DSA algorithm
    final_bill, schedule = energy_optimizer(
        data.M, data.Z, data.D, data.X, data.Y
    )
    
    # Format the schedule to match what Dashboard.jsx expects
    formatted_schedule = []
    for action in schedule:
        formatted_schedule.append({
            "hour": action["Hour"],
            "demand": float(data.D[action["Hour"]]),
            "solar": float(data.X[action["Hour"]]),
            "price": float(data.Y[action["Hour"]]),
            "B_bought": float(action["Bought"]),
            "B_sold": float(action["Sold"]),
            "B_charged": float(action["Charged"]),
            "B_discharged": float(action["Discharged"]),
            "SOC": float((action["Battery_Level"] / data.M) * 100) if data.M > 0 else 0.0
        })
    
    # Send the results back to React as JSON matching the expected format
    return {
        "status": "success",
        "total_cost": final_bill,
        "schedule": formatted_schedule
    }