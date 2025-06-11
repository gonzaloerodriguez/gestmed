# scripts/restore-backup.sh
#!/bin/bash

# Script para restaurar backup
# Uso: ./restore-backup.sh backup_20241211_020000.sql.gz.gpg

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

echo "Desencriptando backup..."
gpg --decrypt --quiet --batch --passphrase "$BACKUP_ENCRYPTION_KEY" "$BACKUP_FILE" > "$DECRYPTED_FILE" || {
    echo "Error: Clave incorrecta o archivo dañado"
    exit 1
}

echo "Descomprimiendo..."
gunzip "$DECRYPTED_FILE" || {
    echo "Error al descomprimir"
    rm "$DECRYPTED_FILE"  # Limpiar archivo temporal
    exit 1
}

# Solicitar confirmación antes de restaurar
read -p "¡ADVERTENCIA! Esto sobrescribirá la base de datos actual. ¿Estás seguro? (s/N): " CONFIRM
if [[ "$CONFIRM" != "s" && "$CONFIRM" != "S" ]]; then
    echo "Restauración cancelada"
    rm "$SQL_FILE"  # Limpiar archivo temporal
    exit 0
fi

# Solicitar URL de la base de datos
read -p "Ingresa la URL de conexión a la base de datos: " DATABASE_URL

echo "Restaurando base de datos..."
psql "$DATABASE_URL" < "$SQL_FILE" || {
    echo "Error al restaurar la base de datos"
    rm "$SQL_FILE"  # Limpiar archivo temporal
    exit 1
}

echo "Limpiando archivos temporales..."
rm "$SQL_FILE"

echo "✅ Restauración completada exitosamente!"