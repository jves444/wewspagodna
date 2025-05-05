import pandas as pd
import numpy as np
import joblib
import os
from sklearn.preprocessing import LabelEncoder

# === 1. Load model and columns ===
# Set paths to the pkl folder in the root directory
model_path = os.path.join(os.path.dirname(__file__), "pkl", "RFA_model.pkl")
columns_path = os.path.join(os.path.dirname(__file__), "pkl", "model_columns.pkl")

# Check if the model and columns file exist
if not os.path.exists(model_path):
    raise FileNotFoundError(f"Model file '{model_path}' not found.")

if not os.path.exists(columns_path):
    raise FileNotFoundError(f"Model columns file '{columns_path}' not found.")

# Load the model and model columns
model = joblib.load(model_path)
model_columns = joblib.load(columns_path)

# === 2. Setup LabelEncoder ===
moisture_encoder = LabelEncoder()
moisture_encoder.classes_ = np.array(["DRY", "MOIST", "WET"])


# === 3. Define prepare function ===
def prepare_input(raw_input):
    """Prepare the input data for the model"""
    input_df = pd.DataFrame([raw_input])

    # Encode 'Moisture' with handling for unseen labels
    if "Moisture" in input_df.columns:
        try:
            input_df["Moisture"] = moisture_encoder.transform(input_df["Moisture"])
        except ValueError:
            # In case of an unseen label, we default to the 'DRY' class (or handle differently)
            print(
                f"Warning: Unseen Moisture value '{raw_input['Moisture']}', defaulting to 'DRY'."
            )
            input_df["Moisture"] = moisture_encoder.transform(["DRY"])

    # Remove target column if accidentally present
    if "Soil_Fertility" in input_df.columns:
        input_df.drop(columns=["Soil_Fertility"], inplace=True)

    # Add missing columns
    for col in model_columns:
        if col not in input_df.columns:
            input_df[col] = 0

    # Keep correct column order
    input_df = input_df[model_columns]

    return input_df


# === 4. Predict function ===
def predict(raw_input):
    """Prepare the input and make the prediction"""
    prepared_input = prepare_input(raw_input)
    prediction = model.predict(prepared_input)
    return prediction[0]
