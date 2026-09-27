<?php

namespace Database\Seeders;

use App\Models\Region;
use Illuminate\Database\Seeder;

class RegionSeeder extends Seeder
{
    public function run(): void
    {
        $regions = [
            ['name' => 'Nairobi Region', 'code' => 'NRB'],
            ['name' => 'Greater Nairobi Region', 'code' => 'GNR'],
            ['name' => 'Mount Kenya Region', 'code' => 'MKT'],
            ['name' => 'Rift Valley Region', 'code' => 'RVL'],
            ['name' => 'Western Region', 'code' => 'WST'],
            ['name' => 'Coast Region', 'code' => 'CST'],
        ];

        foreach ($regions as $region) {
            Region::firstOrCreate(['code' => $region['code']], $region);
        }
    }
}
