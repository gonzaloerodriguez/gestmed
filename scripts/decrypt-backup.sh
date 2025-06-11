# scripts/decrypt-backup.sh
#!/bin/bash

# Script para ver el contenido de un backup sin restaurarlo
# Uso: ./decrypt-backup.sh backup_20241211_020000.sql.gz.gpg

if [ $# -eq 0 ]; then
    echo "Uso: $0 <archivo_backup_encriptado>"
    exit 1
fi

# Verificar que el archivo existe
if [ ! -f "$1" ]; then
    echo "Error: El archivo $1 no existe"
    exit 1
fi

# Solicitar la clave de encriptación
read -sp "Ingresa la clave de encriptación del backup: " BACKUP_ENCRYPTION_KEY
echo ""

BACKUP_FILE=$1
DECRYPTED_FILE="${BACKUP_FILE%.gpg}"
SQL_FILE="${DECRYPTED_FILE%.gz}"
TEMP_DIR="temp_backup_view"

echo "Creando directorio temporal..."
mkdir -p "$TEMP_DIR"

echo "Desencriptando backup..."
gpg --decrypt --quiet --batch --passphrase "$BACKUP_ENCRYPTION_KEY" "$BACKUP_FILE" > "$TEMP_DIR/$DECRYPTED_FILE" || {
    echo "Error: Clave incorrecta o archivo dañado"
    rm -rf "$TEMP_DIR"
    exit 1
}

echo "Descomprimiendo..."
gunzip "$TEMP_DIR/$DECRYPTED_FILE" || {
    echo "Error al descomprimir"
    rm -rf "$TEMP_DIR"
    exit 1
}

echo "✅ Backup desencriptado en: $TEMP_DIR/$SQL_FILE"
echo ""
echo "Puedes examinar el archivo con:"
echo "  less $TEMP_DIR/$SQL_FILE"
echo ""
echo "Para ver las tablas incluidas:"
echo "  grep 'CREATE TABLE' $TEMP_DIR/$SQL_FILE"
echo ""
echo "Para ver los datos de una tabla específica:"
echo "  grep -A 50 'COPY public.doctors' $TEMP_DIR/$SQL_FILE"
echo ""
echo "IMPORTANTE: Cuando termines, elimina el directorio temporal con:"
echo "  rm -rf $TEMP_DIR"