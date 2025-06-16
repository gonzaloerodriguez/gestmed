import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Stethoscope, FileText, Shield, Download } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Stethoscope className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">MediScript</h1>
            </div>
            <div className="flex space-x-4">
              <Link href="/login">
                <Button variant="outline">Iniciar Sesión</Button>
              </Link>
              <Link href="/register">
                <Button>Registrarse</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-gray-900 sm:text-6xl">
            Gestión Digital de
            <span className="text-blue-600"> Recetas Médicas</span>
          </h2>
          <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
            Optimiza tu flujo de trabajo médico con nuestro sistema seguro y
            eficiente para crear, gestionar y descargar recetas médicas
            digitales.
          </p>
          <div className="mt-10">
            <Link href="/register">
              <Button size="lg" className="text-lg px-8 py-3">
                Comenzar Ahora
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <Card>
            <CardHeader>
              <FileText className="h-10 w-10 text-blue-600 mb-2" />
              <CardTitle>Recetas Digitales</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Crea recetas médicas con plantillas profesionales y
                personalizadas.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-10 w-10 text-green-600 mb-2" />
              <CardTitle>Seguro y Confiable</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Protección de datos médicos con los más altos estándares de
                seguridad.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Download className="h-10 w-10 text-purple-600 mb-2" />
              <CardTitle>Descarga PDF</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Genera y descarga recetas en formato PDF listas para imprimir.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Stethoscope className="h-10 w-10 text-red-600 mb-2" />
              <CardTitle>Gestión Completa</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Administra tu perfil médico, firma digital y historial de
                recetas.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
