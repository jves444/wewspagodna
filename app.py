import numpy as np
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import pandas as pd
from scipy import stats
import os
import joblib
from loadmodel import predict  # Import your custom prediction logic


app = Flask(
    __name__, template_folder="templates", static_folder="static"
)  # Make sure 'templates/index.html' exists
CORS(app, origins="*")  # Enable CORS to handle cross-origin requests


# ✅ Serve index.html from templates folder
@app.route("/")
def index():
    return render_template("index.html")


# Load the model and column info
model_path = os.path.join(os.path.dirname(__file__), "pkl", "RFA_model.pkl")
columns_path = os.path.join(os.path.dirname(__file__), "pkl", "model_columns.pkl")

try:
    model = joblib.load(model_path)
    model_columns = joblib.load(columns_path)
except FileNotFoundError as e:
    print(f"Error loading files: {str(e)}")
    raise


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response


def compute_mode(df, column_name):
    if column_name not in df.columns:
        raise Exception(f"Column '{column_name}' not found in the CSV.")
    cleaned_series = df[column_name].dropna()
    if cleaned_series.empty:
        raise Exception(f"No valid data found in column '{column_name}'.")
    mode_val = stats.mode(cleaned_series, keepdims=True)[0]
    if isinstance(mode_val, np.ndarray):
        mode_val = mode_val[0]
    if pd.isna(mode_val):
        raise Exception(f"Mode of column '{column_name}' is NaN.")
    return int(mode_val) if isinstance(mode_val, (np.int64, np.float64)) else mode_val


def compute_mean(df, column_name):
    if column_name not in df.columns:
        raise Exception(f"Column '{column_name}' not found in the CSV.")
    cleaned_series = df[column_name].dropna()
    if cleaned_series.empty:
        raise Exception(f"No valid data found in column '{column_name}'.")
    mean_val = cleaned_series.mean()
    if pd.isna(mean_val):
        raise Exception(f"Mean of column '{column_name}' is NaN.")
    return float(mean_val)


@app.route("/evaluate", methods=["POST"])
def evaluate():
    if "file1" not in request.files or "file2" not in request.files:
        return jsonify({"error": "Both CSV files are required."}), 400

    file1 = request.files["file1"]
    file2 = request.files["file2"]

    if file1.filename == "" or file2.filename == "":
        return jsonify({"error": "No file selected."}), 400

    try:
        df1 = pd.read_csv(file1)
        df2 = pd.read_csv(file2)

        nitrogen_mode = compute_mode(df1, "Nitrogen")
        phosphorus_mode = compute_mode(df1, "Phosphorus")
        potassium_mode = compute_mode(df1, "Potassium")
        ph_mean = compute_mean(df2, "Soil_pH")
        moisture_mode = compute_mode(df2, "Soil_Moisture")

        # Categorize moisture
        if moisture_mode < 470:
            moisture_label = "WET"
        elif 470 <= moisture_mode <= 635:
            moisture_label = "MOIST"
        else:
            moisture_label = "DRY"

        raw_input = {
            "Nitrogen": nitrogen_mode,
            "Phosphorus": phosphorus_mode,
            "Potassium": potassium_mode,
            "Soil_pH": ph_mean,
            "Moisture": moisture_label,
        }

        try:
            prediction = predict(raw_input)
        except Exception as e:
            print(f"Prediction error: {str(e)}")
            return (
                jsonify({"error": "Prediction failed due to an internal error."}),
                500,
            )

        return jsonify({"message": "Prediction successful", "prediction": prediction})

    except Exception as e:
        print(f"Evaluation error: {str(e)}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)

# if __name__ == "__main__":
#     # When running locally with Python
#     app.run(host="0.0.0.0", port=5000)
# else:
#     # For production with Gunicorn
#     app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)
