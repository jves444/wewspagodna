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


# === 3. Define prepare function (now supports multiple inputs) ===
def prepare_input(raw_inputs):
    """Prepare a list of raw input dicts for prediction"""
    input_df = pd.DataFrame(raw_inputs)

    # Encode 'Moisture' with safe handling
    if "Moisture" in input_df.columns:
        input_df["Moisture"] = input_df["Moisture"].apply(
            lambda x: x if x in moisture_encoder.classes_ else "DRY"
        )
        input_df["Moisture"] = moisture_encoder.transform(input_df["Moisture"])

    if "Soil_Fertility" in input_df.columns:
        input_df.drop(columns=["Soil_Fertility"], inplace=True)

    for col in model_columns:
        if col not in input_df.columns:
            input_df[col] = 0

    input_df = input_df[model_columns]

    return input_df


# === 4. Predict function (supports multiple inputs) ===
def predict(raw_inputs):
    """Predict fertility from multiple input records"""
    prepared_input = prepare_input(raw_inputs)
    predictions = model.predict(prepared_input)
    return predictions.tolist()
