import os
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import pandas as pd
import joblib

app = Flask(__name__, template_folder="templates", static_folder="static")
CORS(app, origins="*")


@app.route("/")
def index():
    return render_template("index.html")


model_path = os.path.join(os.path.dirname(__file__), "pkl", "RFA_model.pkl")
columns_path = os.path.join(os.path.dirname(__file__), "pkl", "model_columns.pkl")

try:
    model = joblib.load(model_path)
    model_columns = joblib.load(columns_path)
except FileNotFoundError as e:
    print(f"Model loading error: {str(e)}")
    raise


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response


def predict(row):
    try:
        df = pd.DataFrame([row])
        df = df.reindex(columns=model_columns, fill_value=0)
        prediction = model.predict(df)[0]
        print("Prediction for row:", row, "is", prediction)
        return prediction
    except Exception as e:
        print(f"Error predicting for row {row}: {str(e)}")
        return None


def categorize_ph(ph_value):
    if ph_value < 4.5:
        return (
            f"Ultra Acidic: (pH: {ph_value}) \n"
            f"Recommendation: Apply Agricultural Lime, Wood Ash, and Organic Matter. Use Calcium Nitrate or Potassium Nitrate.\n"
        )
    elif 4.5 <= ph_value <= 5.0:
        return (
            f"Strongly Acidic: (pH: {ph_value})\n"
            f" Recommendation: Apply Dolomitic Lime, Compost, and Calcium Nitrate.\n"
        )
    elif 5.1 <= ph_value <= 5.5:
        return (
            f"Moderately Acidic: (pH: {ph_value})\n"
            f"Recommendation: Apply Lime in small amounts, Compost, and Balanced NPK Fertilizers.\n"
        )
    elif 5.6 <= ph_value <= 6.0:
        return (
            f"Slightly Acidic: (pH: {ph_value}) \n"
            f"Recommendation: Add minimal Lime, Compost, and Super Phosphate.\n"
        )
    elif 6.1 <= ph_value <= 6.5:
        return (
            f"Neutral (Optimal Zone): (pH: {ph_value}) \n"
            f"Recommendation: Maintain with Compost and Balanced Fertilizers.\n"
        )
    elif 6.6 <= ph_value <= 7.5:
        return (
            f"Slightly Alkaline: (pH: {ph_value}) \n"
            f"Recommendation: Apply Elemental Sulfur, Organic Matter, and Iron Sulfate. \n"
        )
    elif 7.6 <= ph_value <= 8.5:
        return (
            f"Moderately Alkaline: (pH: {ph_value})\n"
            f"Recommendation: Use Elemental Sulfur, Gypsum, and Acidic Fertilizers.\n"
        )
    else:
        return (
            f"Strongly Alkaline: (pH: {ph_value})\n"
            f"Recommendation: Apply Elemental Sulfur, Gypsum, and Acid-forming Fertilizers.\n"
        )


def nitrogen_recommendation(nitrogen_value):
    calculate_OM = (float(nitrogen_value) * 100) / 2000
    if 1.0 <= calculate_OM < 2.0:  # less than 2 = Low OM organic matter
        return (
            f"NITROGEN RECOMMENDATION\n"
            f"Calculated OM = {calculate_OM} | {nitrogen_value}\n"
            f"Low Nitrogen (OM% < 2%) – Deficient Soil\n"
            f"🔴 SYMPTOMS:\n\n"
            f"Pale or yellowing leaves (especially older ones).\n"
            f"Stunted plant growth and weak stems.\n"
            f"Poor fruit or grain development.\n\n"
            f"Recommended Actions:\n"
            f"✅ Fast-Release Nitrogen Sources: For immediate correction.\n\n"
            f"Urea (46-0-0): Fast-acting but may cause ammonia loss; best applied before rainfall or irrigation.\n"
            f"Ammonium Nitrate (34-0-0): Provides both fast-acting nitrogen and slower-release properties.\n"
            f"Calcium Nitrate (15.5-0-0): Ideal for acidic soils; improves calcium levels alongside nitrogen.\n\n"
            f"✅ Slow-Release Nitrogen Sources: For sustained growth.\n\n"
            f"Organic Manure/Compost: Gradual nitrogen release, improving soil structure.\n"
            f"Blood Meal (12-0-0): Quick organic nitrogen boost.\n"
            f"Feather Meal (12-0-0): Slow-releasing organic option for long-term stability.\n\n"
            f"✅ Crop Rotation with Legumes:\n\n"
            f"Plant nitrogen-fixing crops like beans, peas, or clover to naturally replenish nitrogen.\n\n"
            f"Special Cases Based on Soil Type\n\n"
            f"Sandy Soils: Nitrogen easily leaches away. Use slow-release fertilizers or apply nitrogen in small, frequent doses.\n\n"
            f"Clay Soils: Nitrogen tends to accumulate. Use split applications to prevent excessive buildup.\n\n"
            f"Acidic Soils (pH < 6.0): Apply Calcium Nitrate or Ammonium Nitrate to balance pH and nitrogen levels.\n\n"
            f"Alkaline Soils (pH > 7.5): Use Ammonium Sulfate to provide nitrogen and acidify the soil.\n"
        )
    elif 2.0 < calculate_OM <= 4.0:  # Moderate OM range
        return (
            f"NITROGEN RECOMMENDATION\n"
            f"Calculated OM = {calculate_OM} | {nitrogen_value}\n"
            f"Moderate Nitrogen (OM% 2 – 4%) – Sufficient for Most Crops\n"
            f"🟡 SYMPTOMS:\n\n"
            f"Healthy plant growth but may require slight supplementation for high-yield crops.\n\n"
            f"Recommended Actions:\n"
            f"✅ Apply Balanced Fertilizers:\n\n"
            f"Complete Fertilizers (e.g., 14-14-14) to maintain nitrogen stability.\n\n"
            f"✅ Use Mulching to conserve soil nitrogen.\n\n"
            f"✅ Light application of compost to improve soil structure.\n\n"
            f"Special Cases Based on Soil Type\n\n"
            f"Sandy Soils: Nitrogen easily leaches away. Use slow-release fertilizers or apply nitrogen in small, frequent doses.\n\n"
            f"Clay Soils: Nitrogen tends to accumulate. Use split applications to prevent excessive buildup.\n\n"
            f"Acidic Soils (pH < 6.0): Apply Calcium Nitrate or Ammonium Nitrate to balance pH and nitrogen levels.\n\n"
            f"Alkaline Soils (pH > 7.5): Use Ammonium Sulfate to provide nitrogen and acidify the soil.\n"
        )
    elif calculate_OM > 4.0:  # High OM
        return (
            f"NITROGEN RECOMMENDATION\n"
            f"Calculated OM = {calculate_OM} | {nitrogen_value}\n"
            f"High Nitrogen (OM% > 4%) – Excessive Supply\n"
            f"SYMPTOMS:\n\n"
            f"Dark green leaves with excessive foliage.\n"
            f"Delayed flowering and fruiting.\n"
            f"Increased pest and disease susceptibility.\n\n"
            f"Recommended Actions:\n"
            f"✅ Reduce Nitrogen Fertilizer Use during this growth phase.\n\n"
            f"✅ Apply Phosphorus (P) and Potassium (K) to balance growth and encourage flowering/fruiting.\n\n"
            f"✅ Plant deep-rooted crops like maize or sorghum to absorb excess nitrogen.\n\n"
            f"Special Cases Based on Soil Type\n"
            f"Sandy Soils: Nitrogen easily leaches away. Use slow-release fertilizers or apply nitrogen in small, frequent doses.\n"
            f"Clay Soils: Nitrogen tends to accumulate. Use split applications to prevent excessive buildup.\n"
            f"Acidic Soils (pH < 6.0): Apply Calcium Nitrate or Ammonium Nitrate to balance pH and nitrogen levels.\n"
            f"Alkaline Soils (pH > 7.5): Use Ammonium Sulfate to provide nitrogen and acidify the soil.\n"
        )
    elif calculate_OM < 1.0:
        return (
            f"NITROGEN RECOMMENDATION\n"
            f"Calculated OM = {calculate_OM} | {nitrogen_value}\n"
            f"Critically Low Nitrogen Content!\n\n"
            f"Immediate Nitrogen Supplementation:\n"
            f"--- Inorganic Fertilizers ---\n"
            f"Urea (46-0-0):\n"
            f"    Description: A highly concentrated nitrogen source, urea provides rapid nitrogen availability.\n"
            f"    Considerations: To minimize ammonia volatilization, apply urea before rainfall or irrigation, or incorporate it into the soil promptly after application.\n\n"
            f"Ammonium Nitrate (34-0-0):\n"
            f"    Description: Offers both ammonium and nitrate forms of nitrogen, ensuring immediate and sustained nitrogen availability.\n"
            f"    Considerations: Less prone to volatilization compared to urea, making it suitable for surface applications.\n\n"
            f"Ammonium Sulfate (21-0-0):\n"
            f"    Description: Provides nitrogen and sulfur, beneficial for soils requiring sulfur supplementation.\n"
            f"    Considerations: More acidifying than other nitrogen sources, monitor soil pH.\n\n"
            f"Enhancing Organic Matter:\n"
            f"--- Incorporation of Organic Amendments ---\n"
            f"Composted Manure:\n"
            f"    Description: Increases soil organic matter, improves soil structure, and provides a slow-release source of nitrogen and other nutrients.\n"
            f"    Considerations: Ensure manure is fully composted to reduce the risk of pathogens and weed seeds.\n\n"
            f"Cover Crops:\n"
            f"    Description: Leguminous cover crops (e.g., clover, vetch) enhance soil organic matter and fix atmospheric nitrogen, enriching the soil naturally.\n\n"
            f"Crop Residue Management:\n"
            f"    Description: Leaving crop residues on the field after harvest contributes to organic matter buildup over time.\n\n"
            f"--- Benefits of Organic Matter ---\n"
            f"Soil Structure Improvement:\n"
            f"    Enhances soil aggregation, leading to better aeration, water infiltration, and root penetration.\n\n"
            f"Nutrient Retention:\n"
            f"    Improves the soil's cation exchange capacity, allowing it to hold onto essential nutrients and reduce leaching losses.\n\n"
            f"Microbial Activity:\n"
            f"    Supports a diverse and active soil microbial community, crucial for nutrient cycling and overall soil health.\n"
        )
    else:
        return "No specific recommendation available."


def phosphorus_recommendation(phosphorus_value):
    def olsen_method(P):
        if P < 9.0:
            return "Low"
        elif 9.0 <= P <= 14.0:
            return "Marginal"
        elif 14.0 < P <= 20.0:
            return "Adequate"
        else:
            return "High"

    def mehlich3_method(P):
        if P <= 12:
            return "Very Low"
        elif 12.1 <= P <= 22.5:
            return "Low"
        elif 22.6 <= P <= 35.9:
            return "Medium"
        elif 36.0 <= P <= 68.5:
            return "High"
        else:
            return "Very High"

    olsen = olsen_method(phosphorus_value)
    mehlich3 = mehlich3_method(phosphorus_value)

    if phosphorus_value < 10:
        return (
            f"REFERENCES: Olsen Method: {olsen}  |  Mehlich-3 Method: {mehlich3}\n"
            f"Message: Low Phosphorus\n"
            f"Symptoms:\n"
            f"- Stunted growth and delayed maturity\n"
            f"- Dark green or purplish foliage\n"
            f"Recommended Actions:\n"
            f"  Organic Phosphorus Sources:\n"
            f"  - Rock Phosphate: Apply based on soil test results.\n"
            f"  - Bone Meal: Incorporate into the soil before planting.\n"
            f"  - Composted Manure: Ensure it's fully composted.\n"
            f"  Special Cases:\n"
            f"    Sandy Soils: Use organic matter to enhance nutrient retention.\n"
            f"    Clay Soils: Incorporate organic amendments to improve aeration.\n\n"
        )
    elif 10.1 < phosphorus_value <= 20:
        return (
            f"REFERENCES: Olsen Method: {olsen}  |  Mehlich-3 Method: {mehlich3}\n"
            f"Moderate Phosphorus Content\n"
            f"Symptoms:\n"
            f"- Generally healthy growth with potential phosphorus limitations during peak demand\n"
            f"Recommended Actions:\n"
            f"  Maintain Phosphorus Levels:\n"
            f"  - Compost Application: Regularly add compost to supply nutrients and enhance soil health.\n"
            f"  - Cover Crops: Plant legumes or other cover crops to fix nitrogen and mobilize phosphorus.\n"
            f"  Special Cases Based on Soil Type:\n"
            f"    Sandy Soils: Incorporate organic matter to boost nutrient and moisture retention.\n"
            f"    Clay Soils: Ensure proper drainage to maintain nutrient balance.\n"
        )
    elif 20.1 <= phosphorus_value <= 40:
        return (
            f"REFERENCES: Olsen Method: {olsen}  |  Mehlich-3 Method: {mehlich3}\n"
            f"Medium (Optimal) Phosphorus Content\n"
            f"Symptoms:\n"
            f"- Optimal growth with no phosphorus deficiencies\n"
            f"Recommended Actions:\n"
            f"  Sustain Soil Fertility:\n"
            f"  - Crop Rotation: Rotate crops to prevent nutrient depletion and maintain soil health.\n"
            f"  - Mulching: Apply organic mulches to conserve moisture and add organic matter.\n"
            f"  Special Cases Based on Soil Type:\n"
            f"    Sandy Soils: Continue adding organic matter to support soil structure.\n"
            f"    Clay Soils: Maintain organic amendments to improve soil properties.\n"
        )
    elif phosphorus_value > 40.1:
        return (
            f"REFERENCES: Olsen Method: {olsen}  |  Mehlich-3 Method: {mehlich3}\n"
            f"High Phosphorus Content\n"
            f"Soil Test Levels: Above 40 ppm or 80 lbs/acre\n"
            f"Symptoms:\n"
            f"- No immediate plant symptoms, but excessive phosphorus can lead to environmental issues, such as water eutrophication.\n"
            f"Recommended Actions:\n"
            f"  Avoid Additional Phosphorus:\n"
            f"  - Cease Phosphorus Fertilization: Refrain from adding phosphorus-rich fertilizers to prevent further accumulation.\n"
            f"  - Erosion Control: Implement practices like cover cropping and mulching to reduce phosphorus runoff.\n"
            f"  Special Cases Based on Soil Type:\n"
            f"    Sandy Soils: Monitor for leaching into groundwater.\n"
            f"    Clay Soils: Prevent runoff by maintaining soil structure and organic matter.\n"
        )


def potassium_recommendation(potassium_value):
    if potassium_value < 25:
        return (
            f"REFERENCES: Soil Test Potassium Level: {potassium_value} mg/kg\n"
            f"Message: Low Potassium\n"
            f"Symptoms:\n"
            f"- Yellowing or scorching along leaf margins, starting with older leaves\n"
            f"- Curling of leaf tips\n"
            f"- Reduced plant growth and yield\n"
            f"Recommended Actions:\n"
            f"  Organic Potassium Sources:\n"
            f"  - Compost: Apply well-decomposed compost to improve nutrient content and soil structure.\n"
            f"  - Wood Ash: Use sparingly due to its high potassium content and potential to raise soil pH; conduct a soil test before application.\n"
            f"  Inorganic Potassium Sources:\n"
            f"  - Potassium Sulfate (Sulfate of Potash): Apply based on soil test recommendations; suitable for soils needing sulfur.\n"
            f"  - Potassium Chloride (Muriate of Potash): Common potassium fertilizer; use according to soil test results.\n"
            f"  Special Cases:\n"
            f"    Sandy Soils: Incorporate organic matter to enhance nutrient retention and reduce leaching.\n"
            f"    Heavy Clay Soils: Ensure proper drainage and aeration to improve root health and nutrient uptake.\n"
        )
    elif 25 <= potassium_value <= 50:
        return (
            f"REFERENCES: Soil Test Potassium Level: {potassium_value} mg/kg\n"
            f"Message: Moderate Potassium\n"
            f"Symptoms:\n"
            f"- Potential early signs of deficiency under high crop demand or stress conditions\n"
            f"Recommended Actions:\n"
            f"  - Monitor crop health regularly for any deficiency symptoms.\n"
            f"  - Consider maintenance applications of potassium fertilizers based on crop needs and soil test results.\n"
        )
    elif potassium_value > 50:
        return (
            f"REFERENCES: Soil Test Potassium Level: {potassium_value} mg/kg\n"
            f"Message: High Potassium\n"
            f"Symptoms:\n"
            f"- Unlikely to exhibit potassium deficiency symptoms.\n"
            f"Recommended Actions:\n"
            f"  - Regular soil testing to monitor potassium levels.\n"
            f"  - Avoid excessive potassium fertilization to prevent nutrient imbalances.\n"
        )


@app.route("/evaluate", methods=["POST"])
def evaluate():
    try:
        data = request.get_json()

        d0_data = data.get("d0Data", [])
        d1_data = data.get("d1Data", [])

        # Collect values
        nitrogen_vals = []
        phosphorus_vals = []
        potassium_vals = []
        ph_vals = []

        predictions = []

        for d0, d1 in zip(d0_data, d1_data):
            nitrogen_vals.append(float(d0.get("Nitrogen", 0)))
            phosphorus_vals.append(float(d0.get("Phosphorus", 0)))
            potassium_vals.append(float(d0.get("Potassium", 0)))
            ph_vals.append(float(d1.get("Soil_pH", 0)))

            merged_row = {
                "Nitrogen": nitrogen_vals[-1],
                "Phosphorus": phosphorus_vals[-1],
                "Potassium": potassium_vals[-1],
                "Soil_pH": ph_vals[-1],
            }

            pred = predict(merged_row)
            predictions.append(pred)

        # Calculate and round average values
        avg_nitrogen = (
            round(sum(nitrogen_vals) / len(nitrogen_vals)) if nitrogen_vals else 0
        )
        avg_phosphorus = (
            round(sum(phosphorus_vals) / len(phosphorus_vals)) if phosphorus_vals else 0
        )
        avg_potassium = (
            round(sum(potassium_vals) / len(potassium_vals)) if potassium_vals else 0
        )
        avg_ph = round(sum(ph_vals) / len(ph_vals), 1) if ph_vals else 0

        overall_recommendations = {
            "ph": categorize_ph(avg_ph),
            "nitrogen": nitrogen_recommendation(avg_nitrogen),
            "phosphorus": phosphorus_recommendation(avg_phosphorus),
            "potassium": potassium_recommendation(avg_potassium),
        }

        prediction_descriptions = {
            "Poor": "Compact soil, low SOM, poor drainage, low biology — all described explicitly.",
            "Moderate": "Mid-range scores, average biological/chemical balance.",
            "High": "Optimal biological activity, good structure, high SOM — consistent across sources.",
        }

        predictions_with_descriptions = [
            {
                "result": pred,
                "description": prediction_descriptions.get(
                    pred, "No description available."
                ),
            }
            for pred in predictions
        ]

        return jsonify(
            {
                "predictions": predictions_with_descriptions,
                "overall_recommendation": overall_recommendations,
                "averages": {
                    "Nitrogen": avg_nitrogen,
                    "Phosphorus": avg_phosphorus,
                    "Potassium": avg_potassium,
                    "Soil_pH": avg_ph,
                },
            }
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)
