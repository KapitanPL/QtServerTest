import random
import datetime

# Define lists of names, tissues, and projects
names = ["Edison", "Einstein", "Curie", "Tesla", "Newton", "Galileo", "Darwin", "Feynman", "Bohr", "Hawking"]
tissues = ["Heart", "Brain", "Liver", "Kidney", "Lung", "Pancreas", "Stomach", "Intestine", "Skin", "Bone"]
staining = ["Red", "Blue", "Green", "Yellow", "Purple", "Orange", "Pink", "Brown", "Black", "White"]
projects = ["Animate dead", "Revive", "Clone", "Regenerate", "Transplant", "Repair", "Enhance", "Modify", "Adapt", "Fortify"]

# Generate random data
num_entries = 10000
data = []

for _ in range(num_entries):
    name = random.choice(names)
    date = datetime.date.today() - datetime.timedelta(days=random.randint(0, 365*5))  # Random date within the last 5 years
    tissue = random.choice(tissues)
    stain = random.choice(staining)
    project = random.choice(projects)
    data.append(f"{name},{date},{tissue},{stain},{project}")

# Write to file
with open("data.txt", "w") as file:
    file.write("\n".join(data))