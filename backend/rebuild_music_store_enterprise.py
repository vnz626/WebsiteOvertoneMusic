"""
Rebuild Database Enterprise Overtone Music Store (Swee Lee Style)
Script ini meneruskan eksekusi ke `seed_sweelee_retail.py` untuk memastikan
seluruh tabel berformat double underscore (`__`) dan database `overtone_store`
terisi secara konsisten.
"""
from seed_sweelee_retail import reset_and_initialize_database

if __name__ == "__main__":
    reset_and_initialize_database()
