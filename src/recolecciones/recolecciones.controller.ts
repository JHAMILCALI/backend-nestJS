import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
  UseInterceptors,
  UploadedFiles,
  ParseIntPipe,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import * as qs from 'qs';
import { RecoleccionesService } from './recolecciones.service';
import { CreateRecoleccionDto } from './dto/create-recoleccion.dto';
import { FiltersRecoleccionDto } from './dto/filters-recoleccion.dto';

@Controller('recolecciones')
export class RecoleccionesController {
  constructor(private readonly recoleccionesService: RecoleccionesService) {}

  /**
   * POST /api/recolecciones
   * Crea una nueva recolección
   */
  @Post()
  // @UseGuards(JwtAuthGuard) // Descomentar cuando tengas el guard configurado
  @UseInterceptors(FileFieldsInterceptor([{ name: 'fotos', maxCount: 5 }]))
  async create(
    @Body() bodyRaw: any,
    // @Request() req: any, // Descomentar cuando tengas el guard
    @UploadedFiles() files?: { fotos?: any[] },
  ) {
    // Parsear datos anidados de FormData (ubicacion[pais], nueva_planta[especie], etc.)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const parsedBody: any = qs.parse(bodyRaw);
    
    // Convertir strings a tipos correctos
    if (parsedBody.cantidad) {
      parsedBody.cantidad = parseFloat(parsedBody.cantidad);
    }
    if (parsedBody.vivero_id) {
      parsedBody.vivero_id = parseInt(parsedBody.vivero_id, 10);
    }
    if (parsedBody.metodo_id) {
      parsedBody.metodo_id = parseInt(parsedBody.metodo_id, 10);
    }
    if (parsedBody.planta_id) {
      parsedBody.planta_id = parseInt(parsedBody.planta_id, 10);
    }
    if (parsedBody.especie_nueva !== undefined) {
      parsedBody.especie_nueva = parsedBody.especie_nueva === 'true';
    }
    
    // Convertir coordenadas a números
    if (parsedBody.ubicacion) {
      if (parsedBody.ubicacion.latitud) {
        parsedBody.ubicacion.latitud = parseFloat(parsedBody.ubicacion.latitud);
      }
      if (parsedBody.ubicacion.longitud) {
        parsedBody.ubicacion.longitud = parseFloat(parsedBody.ubicacion.longitud);
      }
    }
    
    // Convertir a DTO y validar
    const createRecoleccionDto = plainToClass(CreateRecoleccionDto, parsedBody);
    const errors = await validate(createRecoleccionDto);
    
    if (errors.length > 0) {
      const messages = errors.map(err => Object.values(err.constraints || {}).join(', ')).join('; ');
      throw new Error(`Validación fallida: ${messages}`);
    }
    
    // TODO: Descomentar cuando tengas autenticación JWT
    // const authId = req.user.sub; // auth_id desde el JWT
    // const userRole = req.user.rol;
    
    // Por ahora usar valores de prueba
    const authId = 'user_1766236001189_6oeptyz6n'; // Cambiar por req.user.sub
    const userRole = 'ADMIN'; // Cambiar por req.user.rol

    return this.recoleccionesService.create(
      createRecoleccionDto,
      authId,
      userRole,
      files?.fotos,
    );
  }

  /**
   * GET /api/recolecciones
   * Lista recolecciones del usuario autenticado con filtros
   */
  @Get()
  // @UseGuards(JwtAuthGuard) // Descomentar cuando tengas el guard configurado
  async findAll(
    @Query() filters: FiltersRecoleccionDto,
    // @Request() req: any, // Descomentar cuando tengas el guard
  ) {
    // TODO: Descomentar cuando tengas autenticación JWT
    // const authId = req.user.sub; // auth_id desde el JWT
    
    // Por ahora usar valores de prueba
    const authId = 'user_1766236001189_6oeptyz6n'; // Cambiar por req.user.sub
    
    return this.recoleccionesService.findAll(authId, filters);
  }

  /**
   * GET /api/recolecciones/:id
   * Obtiene detalle de una recolección
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.recoleccionesService.findOne(id);
  }
}
