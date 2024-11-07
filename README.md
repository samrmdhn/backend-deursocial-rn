# Mengatasi data penuh pada table
SELECT last_value FROM ir_citys_id_seq;
SELECT setval('ir_citys_id_seq', (SELECT max(id) FROM ir_citys));