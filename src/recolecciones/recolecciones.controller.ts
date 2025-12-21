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
    @Body() createRecoleccionDto: CreateRecoleccionDto,
    // @Request() req: any, // Descomentar cuando tengas el guard
    @UploadedFiles() files?: { fotos?: any[] },
  ) {
    // TODO: Descomentar cuando tengas autenticación
    // const userId = req.user.id;
    // const userRole = req.user.rol;
    
    // Por ahora usar valores de prueba
    const userId = 1; // Cambiar por req.user.id
    const userRole = 'ADMIN'; // Cambiar por req.user.rol

    return this.recoleccionesService.create(
      createRecoleccionDto,
      userId,
      userRole,
      files?.fotos,
    );
  }

  /**
   * GET /api/recolecciones
   * Lista recolecciones con filtros
   */
  @Get()
  async findAll(@Query() filters: FiltersRecoleccionDto) {
    return this.recoleccionesService.findAll(filters);
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
